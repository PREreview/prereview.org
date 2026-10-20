import { Effect, Match, Option, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { type ClubName, Clubs } from '../../../Clubs/index.ts'
import { type ContactEmailAddress, ContactEmailAddresses } from '../../../ContactEmailAddresses/index.ts'
import type { Locale } from '../../../Context.ts'
import type { LanguageDetection } from '../../../ExternalInteractions/index.ts'
import { FeatureFlags } from '../../../FeatureFlags.ts'
import { fixHeadingLevels, html } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import {
  type CompletedForm,
  CompletedFormC,
  type Form,
  type FormStoreEnv,
  type NewPrereview,
  type PublishPrereviewEnv,
  deleteForm,
  getForm,
  guessLanguage,
  nextFormPath,
  saveForm,
} from '../../../PreprintReviews/index.ts'
import {
  type IndeterminatePreprintId,
  type PreprintTitle,
  type Preprints,
  getPreprintTitle,
} from '../../../Preprints/index.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import type { AddToSessionEnv } from '../../session.ts'
import { storeInformationForWriteReviewPublishedPage } from '../published-review.ts'
import { failureMessage } from './failure-message.ts'
import { getCompetingInterests, getUseOfAi, publishForm } from './publish-form.ts'

export const writeReviewPublish = ({
  id,
  locale,
  method,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  FormStoreEnv &
    PublishPrereviewEnv &
    AddToSessionEnv &
    EffectToFpts.EffectEnv<
      | Clubs
      | ContactEmailAddresses
      | FeatureFlags
      | LanguageDetection.LanguageDetection
      | Locale
      | Prereviewers.Prereviewers
      | Preprints
    >,
  Response
> =>
  pipe(
    EffectToFpts.toReaderTaskEither(getPreprintTitle(id)),
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
          RTE.bindW(
            'contactEmailAddress',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(
                function* ({ user }) {
                  const contactEmailAddresses = yield* ContactEmailAddresses
                  return yield* contactEmailAddresses.getContactEmailAddress(user.orcid)
                },
                Effect.catchTag('ContactEmailAddressIsNotFound', () => Effect.succeed(undefined)),
              ),
            ),
          ),
          RTE.bindW(
            'club',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(function* ({ form }) {
                const clubs = yield* Clubs

                if (E.isLeft(form)) {
                  return
                }

                if (typeof form.right.club !== 'string') {
                  return form.right.club
                }

                return yield* clubs.getClubName(form.right.club)
              }),
            ),
          ),
          RTE.apSW(
            'canClubLeadsAddReviewsToClubs',
            EffectToFpts.toReaderTaskEither(
              Effect.gen(function* () {
                const featureFlags = yield* FeatureFlags

                return featureFlags.canClubLeadsAddReviewsToClubs
              }),
            ),
          ),
          RTE.bindW(
            'isClubLead',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(function* ({ canClubLeadsAddReviewsToClubs, user }) {
                const clubs = yield* Clubs

                if (!canClubLeadsAddReviewsToClubs) {
                  return
                }

                return yield* clubs.isPrereviewerAClubLead(user.orcid)
              }),
            ),
          ),
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
  club: ClubName | null | undefined
  canClubLeadsAddReviewsToClubs: boolean
  isClubLead: boolean | undefined
  originalForm: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  match(state)
    .with(
      P.union({ form: P.when(E.isLeft) }, { originalForm: { alreadyWritten: P.optional(undefined) } }),
      ({ originalForm, preprint }) =>
        RT.of(RedirectResponse({ location: nextFormPath({ form: originalForm, preprintId: preprint.id }) })),
    )
    .with({ canClubLeadsAddReviewsToClubs: true, isClubLead: true, club: P.optional(undefined) }, () =>
      RT.of(RedirectResponse({ location: Routes.ReviewAPreprintAddToAClub.href({ preprintId: state.preprint.id }) })),
    )
    .with({ contactEmailAddress: P.optional({ _tag: 'UnverifiedContactEmailAddress' }) }, () =>
      RT.of(
        RedirectResponse({ location: format(writeReviewEnterEmailAddressMatch.formatter, { id: state.preprint.id }) }),
      ),
    )
    .with({ method: 'POST', form: P.when(E.isRight) }, ({ form, ...state }) =>
      handlePublishForm({ ...state, form: form.right }),
    )
    .with({ form: P.when(E.isRight) }, ({ form, ...state }) =>
      pipe(
        EffectToFpts.toReaderTaskEither(
          Prereviewers.getPersona({ orcidId: state.user.orcid, persona: form.right.persona }),
        ),
        RTE.matchW(
          () => failureMessage(state.locale),
          persona =>
            showPublishForm({
              ...state,
              persona,
              form: form.right,
            }),
        ),
      ),
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
    deleteForm(user.orcid, preprint.id),
    RTE.chainW(() =>
      pipe(
        RTE.Do,
        RTE.apS('language', EffectToFpts.toReaderTaskEither(guessLanguage(form))),
        RTE.apSW(
          'persona',
          EffectToFpts.toReaderTaskEither(Prereviewers.getPersona({ orcidId: user.orcid, persona: form.persona })),
        ),
        RTE.apSW('pseudonymPersona', EffectToFpts.toReaderTaskEither(Prereviewers.getPseudonymPersona(user.orcid))),
        RTE.map(({ language, persona, pseudonymPersona }) => ({
          conduct: form.conduct,
          otherAuthors: form.moreAuthors === 'yes' ? form.otherAuthors : [],
          club: Option.fromNullable(form.club),
          language,
          license: match(form.generativeAiIdeas)
            .with('yes', () => 'CC0-1.0' as const)
            .with('no', () => 'CC-BY-4.0' as const)
            .exhaustive(),
          locale,
          persona,
          preprint,
          review: renderReview(form, locale),
          structured: form.reviewType === 'questions',
          user: { orcidId: user.orcid, pseudonym: pseudonymPersona.pseudonym },
        })),
      ),
    ),
    RTE.chainW(
      flow(
        publishPrereview,
        RTE.orElseFirstW(error =>
          match(error)
            .with('unavailable', () => saveForm(user.orcid, preprint.id)(originalForm))
            .exhaustive(),
        ),
      ),
    ),
    RTE.chainFirstW(([doi, id]) =>
      storeInformationForWriteReviewPublishedPage(
        doi,
        form.moreAuthors,
        form.moreAuthors === 'yes' ? form.otherAuthors.length : 0,
        form.persona,
        id,
      ),
    ),
    RTE.matchW(
      () => failureMessage(locale),
      () => RedirectResponse({ location: format(writeReviewPublishedMatch.formatter, { id: preprint.id }) }),
    ),
  )

const showPublishForm = ({
  form,
  club,
  preprint,
  persona,
  locale,
}: {
  form: CompletedForm
  club: ClubName | null | undefined
  preprint: PreprintTitle
  persona: Prereviewers.Persona
  locale: SupportedLocale
}) => publishForm(preprint, form, club, persona, locale)

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
              ${
                form.introductionMatches !== 'skip' && form.introductionMatchesDetails
                  ? html` <dd>${form.introductionMatchesDetails}</dd>`
                  : ''
              }
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
              ${
                form.methodsAppropriate !== 'skip' && form.methodsAppropriateDetails
                  ? html` <dd>${form.methodsAppropriateDetails}</dd>`
                  : ''
              }
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
              ${
                form.resultsSupported !== 'skip' && form.resultsSupportedDetails
                  ? html` <dd>${form.resultsSupportedDetails}</dd>`
                  : ''
              }
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
              ${
                form.dataPresentation !== 'skip' && form.dataPresentationDetails
                  ? html` <dd>${form.dataPresentationDetails}</dd>`
                  : ''
              }
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
              ${
                form.findingsNextSteps !== 'skip' && form.findingsNextStepsDetails
                  ? html` <dd>${form.findingsNextStepsDetails}</dd>`
                  : ''
              }
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
