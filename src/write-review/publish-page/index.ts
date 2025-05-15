import type { Doi } from 'doi-ts'
import { Match, type Option, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { StatusCodes } from 'http-status-codes'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import { type ContactEmailAddress, maybeGetContactEmailAddress } from '../../contact-email-address.js'
import { detectLanguage } from '../../detect-language.js'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../../middleware.js'
import type { TemplatePageEnv } from '../../page.js'
import { type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import type { PublicUrlEnv } from '../../public-url.js'
import { StreamlinePageResponse, handlePageResponse } from '../../response.js'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../routes.js'
import type { AddToSessionEnv } from '../../session.js'
import type { EmailAddress } from '../../types/email-address.js'
import { localeToIso6391 } from '../../types/iso639.js'
import type { NonEmptyString } from '../../types/string.js'
import type { GetUserOnboardingEnv } from '../../user-onboarding.js'
import { type User, getUser } from '../../user.js'
import { type CompletedForm, CompletedFormC } from '../completed-form.js'
import { type Form, type FormStoreEnv, deleteForm, getForm, redirectToNextForm, saveForm } from '../form.js'
import { storeInformationForWriteReviewPublishedPage } from '../published-review.js'
import { getCompetingInterests, publishForm } from './publish-form.js'

export interface NewPrereview {
  conduct: 'yes'
  otherAuthors: ReadonlyArray<{ name: NonEmptyString; emailAddress: EmailAddress }>
  persona: 'public' | 'pseudonym'
  preprint: PreprintTitle
  review: Html
  language: Option.Option<LanguageCode>
  locale: SupportedLocale
  structured: boolean
  user: User
}

export interface PublishPrereviewEnv {
  publishPrereview: (newPrereview: NewPrereview) => TE.TaskEither<'unavailable', [Doi, number]>
}

export const writeReviewPublish = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', getUser),
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
      RM.bindW(
        'originalForm',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bind('form', ({ originalForm }) => RM.right(CompletedFormC.decode(originalForm))),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.bindW('contactEmailAddress', ({ user }) => RM.fromReaderTaskEither(maybeGetContactEmailAddress(user.orcid))),
      RM.ichainW(decideNextStep),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), 'unavailable', () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(
    Match.valueTags({
      PreprintIsNotFound: () => notFound,
      PreprintIsUnavailable: () => serviceUnavailable,
    }),
  ),
)

const decideNextStep = (state: {
  contactEmailAddress?: ContactEmailAddress
  form: E.Either<unknown, CompletedForm>
  originalForm: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  match(state)
    .returnType<
      RM.ReaderMiddleware<
        GetUserOnboardingEnv & PublicUrlEnv & TemplatePageEnv & FormStoreEnv & PublishPrereviewEnv & AddToSessionEnv,
        StatusOpen,
        ResponseEnded,
        never,
        void
      >
    >()
    .with(
      P.union({ form: P.when(E.isLeft) }, { originalForm: { alreadyWritten: P.optional(undefined) } }),
      ({ originalForm }) => RM.fromMiddleware(redirectToNextForm(state.preprint.id)(originalForm)),
    )
    .with({ contactEmailAddress: P.optional({ _tag: 'UnverifiedContactEmailAddress' }) }, () =>
      RM.fromMiddleware(seeOther(format(writeReviewEnterEmailAddressMatch.formatter, { id: state.preprint.id }))),
    )
    .with({ method: 'POST', form: P.when(E.isRight) }, ({ form, ...state }) =>
      handlePublishForm({ ...state, form: form.right }),
    )
    .with({ form: P.when(E.isRight) }, ({ form, ...state }) =>
      showPublishForm({
        ...state,
        form: form.right,
      }),
    )
    .exhaustive()

const handlePublishForm = ({
  form,
  locale,
  originalForm,
  preprint,
  user,
}: {
  form: CompletedForm
  locale: SupportedLocale
  originalForm: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.fromReaderTaskEither(deleteForm(user.orcid, preprint.id)),
    RM.map(() => ({
      conduct: form.conduct,
      otherAuthors: form.moreAuthors === 'yes' ? form.otherAuthors : [],
      language: match(form)
        .returnType<Option.Option<LanguageCode>>()
        .with({ reviewType: 'questions' }, () => localeToIso6391(locale))
        .with({ reviewType: 'freeform' }, form => detectLanguage(form.review))
        .exhaustive(),
      locale,
      persona: form.persona,
      preprint,
      review: renderReview(form, locale),
      structured: form.reviewType === 'questions',
      user,
    })),
    RM.chainReaderTaskEitherKW(
      flow(
        publishPrereview,
        RTE.orElseFirstW(error =>
          match(error)
            .with('unavailable', () => saveForm(user.orcid, preprint.id)(originalForm))
            .exhaustive(),
        ),
      ),
    ),
    RM.chainFirstReaderTaskEitherKW(([doi, id]) => storeInformationForWriteReviewPublishedPage(doi, id, form)),
    RM.ichainFirst(() => RM.status(Status.SeeOther)),
    RM.ichainFirst(() => RM.header('Location', format(writeReviewPublishedMatch.formatter, { id: preprint.id }))),
    RM.ichain(() => RM.closeHeaders()),
    RM.ichain(() => RM.end()),
    RM.orElseW(() => showFailureMessage(user, locale)),
  )

const showPublishForm = ({
  form,
  preprint,
  user,
  locale,
}: {
  form: CompletedForm
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(publishForm(preprint, form, user, locale))),
    RM.ichainW(handlePageResponse),
  )

const publishPrereview = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ publishPrereview }: PublishPrereviewEnv) => publishPrereview(newPrereview)),
  )

const showFailureMessage = (user: User, locale: SupportedLocale) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(failureMessage(locale))),
    RM.ichainW(handlePageResponse),
  )

function renderReview(form: CompletedForm, locale: SupportedLocale) {
  const t = translate(locale, 'write-review')

  return html`${match(form)
      .with(
        { reviewType: 'questions' },
        form =>
          html` <dl>
            <div>
              <dt>${t('doesIntroductionExplain')()}</dt>
              <dd>
                ${match(form.introductionMatches)
                  .with('yes', () => t('yes')())
                  .with('partly', () => t('partly')())
                  .with('no', () => t('no')())
                  .with('skip', () => t('iDoNotKnow')())
                  .exhaustive()}
              </dd>
              ${form.introductionMatches !== 'skip' && form.introductionMatchesDetails
                ? html` <dd>${form.introductionMatchesDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>${t('methodsWellSuited')()}</dt>
              <dd>
                ${match(form.methodsAppropriate)
                  .with('inappropriate', () => t('methodsHighlyInappropriate')())
                  .with('somewhat-inappropriate', () => t('methodsSomewhatInappropriate')())
                  .with('adequate', () => t('methodsNeitherAppropriateNorInappropriate')())
                  .with('mostly-appropriate', () => t('methodsSomewhatAppropriate')())
                  .with('highly-appropriate', () => t('methodsHighlyAppropriate')())
                  .with('skip', () => t('iDoNotKnow')())
                  .exhaustive()}
              </dd>
              ${form.methodsAppropriate !== 'skip' && form.methodsAppropriateDetails
                ? html` <dd>${form.methodsAppropriateDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>${t('conclusionsSupported')()}</dt>
              <dd>
                ${match(form.resultsSupported)
                  .with('not-supported', () => t('conclusionsHighlyUnsupported')())
                  .with('partially-supported', () => t('conclusionsSomewhatUnsupported')())
                  .with('neutral', () => t('conclusionsNeitherSupportedNorUnsupported')())
                  .with('well-supported', () => t('conclusionsSomewhatSupported')())
                  .with('strongly-supported', () => t('conclusionsHighlySupported')())
                  .with('skip', () => t('iDoNotKnow')())
                  .exhaustive()}
              </dd>
              ${form.resultsSupported !== 'skip' && form.resultsSupportedDetails
                ? html` <dd>${form.resultsSupportedDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>${t('dataPresentationWellSuited')()}</dt>
              <dd>
                ${match(form.dataPresentation)
                  .with('inappropriate-unclear', () => t('highlyInappropriate')())
                  .with('somewhat-inappropriate-unclear', () => t('somewhatInappropriate')())
                  .with('neutral', () => t('neitherAppropriateOrClear')())
                  .with('mostly-appropriate-clear', () => t('somewhatAppropriate')())
                  .with('highly-appropriate-clear', () => t('highlyAppropriateAndClear')())
                  .with('skip', () => t('iDoNotKnow')())
                  .exhaustive()}
              </dd>
              ${form.dataPresentation !== 'skip' && form.dataPresentationDetails
                ? html` <dd>${form.dataPresentationDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>${t('clearDiscussion')()}</dt>
              <dd>
                ${match(form.findingsNextSteps)
                  .with('inadequately', () => t('veryUnclearly')())
                  .with('insufficiently', () => t('somewhatUnclearly')())
                  .with('adequately', () => t('neitherClearlyNorUnclearly')())
                  .with('clearly-insightfully', () => t('somewhatClearly')())
                  .with('exceptionally', () => t('veryClearly')())
                  .with('skip', () => t('iDoNotKnow')())
                  .exhaustive()}
              </dd>
              ${form.findingsNextSteps !== 'skip' && form.findingsNextStepsDetails
                ? html` <dd>${form.findingsNextStepsDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>${t('advanceKnowledge')()}</dt>
              <dd>
                ${match(form.novel)
                  .with('no', () => t('advanceKnowledgeNotAtAllLikely')())
                  .with('limited', () => t('advanceKnowledgeNotLikely')())
                  .with('some', () => t('advanceKnowledgeModeratelyLikely')())
                  .with('substantial', () => t('advanceKnowledgeSomewhatLikely')())
                  .with('highly', () => t('advanceKnowledgeHighlyLikely')())
                  .with('skip', () => t('iDoNotKnow')())
                  .exhaustive()}
              </dd>
              ${form.novel !== 'skip' && form.novelDetails ? html` <dd>${form.novelDetails}</dd>` : ''}
            </div>
            <div>
              <dt>${t('benefitFromEditing')()}</dt>
              <dd>
                ${match(form.languageEditing)
                  .with('no', () => t('no')())
                  .with('yes', () => t('yes')())
                  .exhaustive()}
              </dd>
              ${form.languageEditingDetails ? html` <dd>${form.languageEditingDetails}</dd>` : ''}
            </div>
            <div>
              <dt>${t('wouldRecommend')()}</dt>
              <dd>
                ${match(form.shouldRead)
                  .with('no', () => t('wouldRecommendNo')())
                  .with('yes-but', () => t('wouldRecommendYesImproved')())
                  .with('yes', () => t('wouldRecommendYes')())
                  .exhaustive()}
              </dd>
              ${form.shouldReadDetails ? html` <dd>${form.shouldReadDetails}</dd>` : ''}
            </div>
            <div>
              <dt>${t('readyForAttention')()}</dt>
              <dd>
                ${match(form.readyFullReview)
                  .with('no', () => t('readyForAttentionNo')())
                  .with('yes-changes', () => t('readyForAttentionMinorChanges')())
                  .with('yes', () => t('readyForAttentionYes')())
                  .exhaustive()}
              </dd>
              ${form.readyFullReviewDetails ? html` <dd>${form.readyFullReviewDetails}</dd>` : ''}
            </div>
          </dl>`,
      )
      .with({ reviewType: 'freeform' }, form => fixHeadingLevels(1, form.review))
      .exhaustive()}

    <h2>${t('competingInterests')()}</h2>

    <p>${getCompetingInterests(form, locale)}</p>

    ${form.generativeAiIdeas === 'yes'
      ? html`
          <h2>${t('useOfAi')()}</h2>

          <p>
            ${match(form.moreAuthors)
              .with(P.union('yes', 'yes-private'), () => t('aiIdeasAuthorsStatement')())
              .with('no', () => t('aiIdeasStatement')())
              .exhaustive()}
          </p>
        `
      : ''} `
}

function failureMessage(locale: SupportedLocale) {
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    title: plainText(t('havingProblems')()),
    status: StatusCodes.SERVICE_UNAVAILABLE,
    main: html`
      <h1>${t('havingProblems')()}</h1>

      <p>${t('unableToPublish')()}</p>

      <p>${t('tryAgainLater')()}</p>

      <p>${rawHtml(t('getInTouch')({ contact: mailToHelp }))}</p>
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
