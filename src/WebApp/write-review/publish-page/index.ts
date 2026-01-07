import type { Doi } from 'doi-ts'
import { Match, type Option, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import {
  type ContactEmailAddress,
  type GetContactEmailAddressEnv,
  maybeGetContactEmailAddress,
} from '../../../contact-email-address.ts'
import { detectLanguage } from '../../../detect-language.ts'
import { type Html, fixHeadingLevels, html } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../../Preprints/index.ts'
import { RedirectResponse, type Response } from '../../../Response/index.ts'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../../routes.ts'
import type { AddToSessionEnv } from '../../../session.ts'
import type { EmailAddress } from '../../../types/EmailAddress.ts'
import { localeToIso6391 } from '../../../types/iso639.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { type CompletedForm, CompletedFormC } from '../completed-form.ts'
import { type Form, type FormStoreEnv, deleteForm, getForm, nextFormMatch, saveForm } from '../form.ts'
import { storeInformationForWriteReviewPublishedPage } from '../published-review.ts'
import { failureMessage } from './failure-message.ts'
import { getCompetingInterests, getUseOfAi, publishForm } from './publish-form.ts'

export interface NewPrereview {
  conduct: 'yes'
  otherAuthors: ReadonlyArray<{ name: NonEmptyString; emailAddress: EmailAddress }>
  persona: 'public' | 'pseudonym'
  preprint: PreprintTitle
  review: Html
  language: Option.Option<LanguageCode>
  license: 'CC0-1.0' | 'CC-BY-4.0'
  locale: SupportedLocale
  structured: boolean
  user: User
}

export interface PublishPrereviewEnv {
  publishPrereview: (newPrereview: NewPrereview) => TE.TaskEither<'unavailable', [Doi, number]>
}

export const writeReviewPublish = ({
  id,
  locale,
  method,
  user,
  aiReviewsAsCc0 = false,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
  aiReviewsAsCc0?: boolean
}): RT.ReaderTask<
  GetContactEmailAddressEnv & GetPreprintTitleEnv & FormStoreEnv & PublishPrereviewEnv & AddToSessionEnv,
  Response
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.let('locale', () => locale),
          RTE.bindW('originalForm', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('form', ({ originalForm }) => CompletedFormC.decode(originalForm)),
          RTE.let('method', () => method),
          RTE.bindW('contactEmailAddress', ({ user }) => maybeGetContactEmailAddress(user.orcid)),
          RTE.let('aiReviewsAsCc0', () => aiReviewsAsCc0),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', P.instanceOf(Error), 'unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            decideNextStep,
          ),
        ),
    ),
  )

const decideNextStep = (state: {
  contactEmailAddress?: ContactEmailAddress
  form: E.Either<unknown, CompletedForm>
  originalForm: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
  aiReviewsAsCc0: boolean
}) =>
  match(state)
    .with(
      P.union({ form: P.when(E.isLeft) }, { originalForm: { alreadyWritten: P.optional(undefined) } }),
      ({ originalForm, preprint }) =>
        RT.of(RedirectResponse({ location: format(nextFormMatch(originalForm).formatter, { id: preprint.id }) })),
    )
    .with({ contactEmailAddress: P.optional({ _tag: 'UnverifiedContactEmailAddress' }) }, () =>
      RT.of(
        RedirectResponse({ location: format(writeReviewEnterEmailAddressMatch.formatter, { id: state.preprint.id }) }),
      ),
    )
    .with({ method: 'POST', form: P.when(E.isRight) }, ({ form, ...state }) =>
      handlePublishForm({ ...state, form: form.right }),
    )
    .with({ form: P.when(E.isRight) }, ({ form, ...state }) => RT.of(showPublishForm({ ...state, form: form.right })))
    .exhaustive()

const handlePublishForm = ({
  form,
  locale,
  originalForm,
  preprint,
  user,
  aiReviewsAsCc0,
}: {
  form: CompletedForm
  locale: SupportedLocale
  originalForm: Form
  preprint: PreprintTitle
  user: User
  aiReviewsAsCc0: boolean
}) =>
  pipe(
    deleteForm(user.orcid, preprint.id),
    RTE.map(() => ({
      conduct: form.conduct,
      otherAuthors: form.moreAuthors === 'yes' ? form.otherAuthors : [],
      language: match(form)
        .returnType<Option.Option<LanguageCode>>()
        .with({ reviewType: 'questions' }, () => localeToIso6391(locale))
        .with({ reviewType: 'freeform' }, form => detectLanguage(form.review))
        .exhaustive(),
      license: match([aiReviewsAsCc0, form.generativeAiIdeas])
        .with([true, 'yes'], () => 'CC0-1.0' as const)
        .with([false, 'yes'], [P.boolean, 'no'], () => 'CC-BY-4.0' as const)
        .exhaustive(),
      locale,
      persona: form.persona,
      preprint,
      review: renderReview(form, locale),
      structured: form.reviewType === 'questions',
      user,
    })),
    RTE.chain(
      flow(
        publishPrereview,
        RTE.orElseFirstW(error =>
          match(error)
            .with('unavailable', () => saveForm(user.orcid, preprint.id)(originalForm))
            .exhaustive(),
        ),
      ),
    ),
    RTE.chainFirstW(([doi, id]) => storeInformationForWriteReviewPublishedPage(doi, id, form)),
    RTE.matchW(
      () => failureMessage(locale),
      () => RedirectResponse({ location: format(writeReviewPublishedMatch.formatter, { id: preprint.id }) }),
    ),
  )

const showPublishForm = ({
  form,
  preprint,
  user,
  locale,
  aiReviewsAsCc0,
}: {
  form: CompletedForm
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
  aiReviewsAsCc0: boolean
}) => publishForm(preprint, form, user, locale, aiReviewsAsCc0)

const publishPrereview = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ publishPrereview }: PublishPrereviewEnv) => publishPrereview(newPrereview)),
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

    <h2>${t('useOfAi')()}</h2>

    <p>${getUseOfAi(form, locale)}</p>`
}
