import { Effect, Option, pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import { createAuthorInvite } from '../author-invite.ts'
import { Clubs } from '../Clubs/index.ts'
import type { Locale } from '../Context.js'
import { Email, ZenodoRecords } from '../ExternalInteractions/index.ts'
import { fixHeadingLevels, html, type Html } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import type { PreprintTitle } from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'
import type { Doi } from '../types/Doi.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId, Pseudonym } from '../types/index.ts'
import type { Name } from '../types/Name.ts'
import type { Uuid } from '../types/Uuid.ts'
import { getCompetingInterests, getUseOfAi, type CompletedForm } from './legacy-completed-form.ts'
import {
  NotifyCommunitySlackOfPreprintReview,
  NotifyPreprintServerOfReview,
  NotifyReviewRequestersOfReview,
} from './Workflows/index.ts'

export interface NewPrereview {
  conduct: 'yes'
  otherAuthors: ReadonlyArray<{ name: Name; emailAddress: EmailAddress }>
  persona: Prereviewers.Persona
  club: Option.Option<Uuid>
  preprint: PreprintTitle
  review: Html
  language: Option.Option<LanguageCode>
  license: 'CC0-1.0' | 'CC-BY-4.0'
  locale: SupportedLocale
  structured: boolean
  user: { orcidId: OrcidId.OrcidId; pseudonym: Pseudonym.Pseudonym }
}

export interface PublishPrereviewEnv {
  publishPrereview: (newPrereview: NewPrereview) => TE.TaskEither<'unavailable', [Doi, number]>
}

export const publishPrereview = (newPrereview: NewPrereview) =>
  pipe(
    EffectToFpts.toReaderTaskEither(
      Effect.gen(function* () {
        const clubs = yield* Clubs

        const club = yield* Effect.transposeOption(Option.map(newPrereview.club, clubs.getClubName))

        return { ...newPrereview, club }
      }).pipe(Effect.catchTag('ClubNotFound', () => Effect.fail('unavailable' as const))),
    ),
    RTE.chainW(ZenodoRecords.createRecordOnZenodo),
    RTE.chainFirstReaderTaskKW(([, review]) =>
      RT.asksReaderTaskW((env: EffectToFpts.EffectEnv<Locale | Email.Email> & L.LoggerEnv) =>
        pipe(
          newPrereview.otherAuthors,
          RT.traverseSeqArray(otherAuthor =>
            pipe(
              createAuthorInvite({ status: 'open', emailAddress: otherAuthor.emailAddress, review }),
              RTE.chainTaskEitherK(authorInviteId =>
                pipe(
                  EffectToFpts.toTaskEither(
                    Email.inviteAuthor({
                      person: otherAuthor,
                      authorInviteId,
                      newPrereview: {
                        ...newPrereview,
                        author: Prereviewers.getPersonaName(newPrereview.persona),
                      },
                    }),
                    env.runtime,
                  ),
                  TE.mapLeft(() => 'unavailable' as const),
                ),
              ),
              RTE.matchEW(
                () => RT.of(undefined),
                () => RT.fromReaderIO(L.error('Failed to invite author to a review')),
              ),
            ),
          ),
        ),
      ),
    ),
    RTE.chainFirstReaderTaskKW(([, reviewId]) =>
      EffectToFpts.toReaderTaskEither(
        Effect.all(
          [
            NotifyCommunitySlackOfPreprintReview.execute({ reviewId }, { discard: true }),
            NotifyPreprintServerOfReview.execute({ reviewId }, { discard: true }),
            NotifyReviewRequestersOfReview.execute({ reviewId }, { discard: true }),
          ],
          { concurrency: 'inherit' },
        ),
      ),
    ),
    RTE.chainFirstW(([, review]) =>
      EffectToFpts.toReaderTaskEither(
        ZenodoRecords.invalidatePrereviewInCache({
          prereviewId: review,
          preprintId: newPrereview.preprint.id,
          user: newPrereview.user,
        }),
      ),
    ),
  )

export function renderReview(form: CompletedForm, locale: SupportedLocale) {
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
