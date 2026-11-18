import { Array, flow, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { ClubName } from '../../../Domain/Clubs/index.ts'
import {
  getCompetingInterests,
  getLicense,
  getUseOfAi,
  type CompletedForm,
} from '../../../Domain/PreprintReviews/index.ts'
import type { PreprintTitle } from '../../../Domain/Preprints/index.ts'
import * as Preprints from '../../../Domain/Preprints/index.ts'
import * as Prereviewers from '../../../Domain/Prereviewers/index.ts'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import {
  profileMatch,
  writeReviewAddAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewLanguageEditingMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewNovelMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
  writeReviewShouldReadMatch,
} from '../../../routes.ts'
import { ProfileId } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { backNav } from '../shared-elements.ts'

export function publishForm(
  preprint: PreprintTitle,
  review: CompletedForm,
  club: ClubName | null | undefined,
  persona: Prereviewers.Persona,
  locale: SupportedLocale,
) {
  const t = translate(locale, 'write-review')

  const visuallyHidden: { visuallyHidden: (x: Html) => Html } = {
    visuallyHidden: s => html`<span class="visually-hidden">${s}</span>`,
  }

  return StreamlinePageResponse({
    title: plainText(t('publishTitle')({ preprintTitle: preprint.title })),
    nav: backNav(locale, format(writeReviewConductMatch.formatter, { id: preprint.id })),
    main: html`
      <single-use-form>
        <form method="post" action="${format(writeReviewPublishMatch.formatter, { id: preprint.id })}" novalidate>
          <h1>${t('checkPrereview')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${t('preprintDetails')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>${t('preprintTitle')()}</dt>
                <dd>
                  <cite ${languageAttributesFor(preprint.language)}>${preprint.title}</cite>
                </dd>
              </div>
              <div>
                <dt>${t('preprintServer')()}</dt>
                <dd>${Preprints.getServerName(preprint.id)}</dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2>
                ${Match.value(review.moreAuthors).pipe(
                  Match.literalsExhaustive({
                    yes: t('authorDetails'),
                    no: t('yourDetails'),
                    'yes-private': t('yourDetails'),
                  }),
                )}
              </h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>
                  <span
                    >${Match.value(review.moreAuthors).pipe(
                      Match.literalsExhaustive({
                        yes: t('yourPublishedName'),
                        no: t('publishedName'),
                        'yes-private': t('publishedName'),
                      }),
                    )}</span
                  >
                </dt>
                <dd>${displayAuthor(persona)}</dd>
                <dd>
                  <a href="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}"
                    >${t('changeName')(visuallyHidden)}</a
                  >
                </dd>
              </div>

              ${
                review.moreAuthors === 'yes' && Array.isReadonlyArrayNonEmpty(review.otherAuthors)
                  ? html`
                      <div>
                        <dt>${t('invitedAuthors')({ number: review.otherAuthors.length })}</dt>
                        <dd>
                          ${pipe(
                            review.otherAuthors,
                            Array.map(({ name }) => html`<bdi>${name}</bdi>`),
                            formatList(locale),
                          )}
                        </dd>
                        <dd>
                          <a href="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}"
                            >${t('changeInvitedAuthors')(visuallyHidden)}</a
                          >
                        </dd>
                      </div>
                    `
                  : ''
              }
              ${
                club !== undefined
                  ? html`
                      <div>
                        <dt>${t('club')()}</dt>
                        <dd>
                          ${club ? html`<span ${languageAttributesFor(club.language)}>${club.name}</span>` : html`<i>${t('noClub')()}</i>`}
                        </dd>
                        <dd>
                          <a href="${Routes.ReviewAPreprintAddToAClub.href({ preprintId: preprint.id })}"
                            >${t('changeClub')(visuallyHidden)}</a
                          >
                        </dd>
                      </div>
                    `
                  : ''
              }

              <div>
                <dt>${t('useOfAiShort')()}</dt>
                <dd>
                  <p>${getUseOfAi(review, locale)}</p>
                  ${
                    review.generativeAiIdeas === 'yes' && review.generativeAiIdeasDetails
                      ? html`<p>${review.generativeAiIdeasDetails}</p>`
                      : ''
                  }
                </dd>
                <dd>
                  <a href="${Routes.ReviewAPreprintUseOfAi.href({ preprintId: preprint.id })}"
                    >${t('changeUseOfAi')(visuallyHidden)}</a
                  >
                </dd>
              </div>

              <div>
                <dt>${t('competingInterests')()}</dt>
                <dd>${getCompetingInterests(review, locale)}</dd>
                <dd>
                  <a href="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
                    >${t('changeCompetingInterests')(visuallyHidden)}</a
                  >
                </dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2 id="review-label">${t('yourReview')()}</h2>

              ${
                review.reviewType === 'freeform'
                  ? html`
                      <a href="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}"
                        >${t('changePrereview')(visuallyHidden)}</a
                      >
                    `
                  : ''
              }
            </div>

            <div
              aria-labelledby="review-label"
              role="region"
              ${review.reviewType === 'freeform' ? rawHtml('tabindex="0"') : ''}
            >
              ${
                review.reviewType === 'freeform'
                  ? fixHeadingLevels(2, review.review)
                  : html`
                      <dl class="summary-list">
                        <div>
                          <dt>${t('doesIntroductionExplain')()}</dt>
                          <dd>
                            ${Match.value(review.introductionMatches).pipe(
                              Match.literalsExhaustive({
                                yes: t('yes'),
                                partly: t('partly'),
                                no: t('no'),
                                skip: t('iDoNotKnow'),
                              }),
                            )}
                          </dd>
                          ${
                            review.introductionMatches !== 'skip' && review.introductionMatchesDetails
                              ? html` <dd>${review.introductionMatchesDetails}</dd>`
                              : ''
                          }
                          <dd>
                            <a href="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
                              >${t('changeIfIntroExplains')(visuallyHidden)}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt>${t('methodsWellSuited')()}</dt>
                          <dd>
                            ${Match.value(review.methodsAppropriate).pipe(
                              Match.literalsExhaustive({
                                inappropriate: t('methodsHighlyInappropriate'),
                                'somewhat-inappropriate': t('methodsSomewhatInappropriate'),
                                adequate: t('methodsNeitherAppropriateNorInappropriate'),
                                'mostly-appropriate': t('methodsSomewhatAppropriate'),
                                'highly-appropriate': t('methodsHighlyAppropriate'),
                                skip: t('iDoNotKnow'),
                              }),
                            )}
                          </dd>
                          ${
                            review.methodsAppropriate !== 'skip' && review.methodsAppropriateDetails
                              ? html` <dd>${review.methodsAppropriateDetails}</dd>`
                              : ''
                          }
                          <dd>
                            <a href="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}"
                              >${t('changeMethodsWellSuited')(visuallyHidden)}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt>${t('conclusionsSupported')()}</dt>
                          <dd>
                            ${Match.value(review.resultsSupported).pipe(
                              Match.literalsExhaustive({
                                'not-supported': t('conclusionsHighlyUnsupported'),
                                'partially-supported': t('conclusionsSomewhatUnsupported'),
                                neutral: t('conclusionsNeitherSupportedNorUnsupported'),
                                'well-supported': t('conclusionsSomewhatSupported'),
                                'strongly-supported': t('conclusionsHighlySupported'),
                                skip: t('iDoNotKnow'),
                              }),
                            )}
                          </dd>
                          ${
                            review.resultsSupported !== 'skip' && review.resultsSupportedDetails
                              ? html` <dd>${review.resultsSupportedDetails}</dd>`
                              : ''
                          }
                          <dd>
                            <a href="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}"
                              >${t('changeConclusionsSupported')(visuallyHidden)}</a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>${t('dataPresentationWellSuited')()}</dt>
                          <dd>
                            ${Match.value(review.dataPresentation).pipe(
                              Match.literalsExhaustive({
                                'inappropriate-unclear': t('highlyInappropriate'),
                                'somewhat-inappropriate-unclear': t('somewhatInappropriate'),
                                neutral: t('neitherAppropriateOrClear'),
                                'mostly-appropriate-clear': t('somewhatAppropriate'),
                                'highly-appropriate-clear': t('highlyAppropriateAndClear'),
                                skip: t('iDoNotKnow'),
                              }),
                            )}
                          </dd>
                          ${
                            review.dataPresentation !== 'skip' && review.dataPresentationDetails
                              ? html` <dd>${review.dataPresentationDetails}</dd>`
                              : ''
                          }
                          <dd>
                            <a href="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}"
                              >${t('changeDataPresentationWellSuited')(visuallyHidden)}</a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>${t('clearDiscussion')()}</dt>
                          <dd>
                            ${Match.value(review.findingsNextSteps).pipe(
                              Match.literalsExhaustive({
                                inadequately: t('veryUnclearly'),
                                insufficiently: t('somewhatUnclearly'),
                                adequately: t('neitherClearlyNorUnclearly'),
                                'clearly-insightfully': t('somewhatClearly'),
                                exceptionally: t('veryClearly'),
                                skip: t('iDoNotKnow'),
                              }),
                            )}
                          </dd>
                          ${
                            review.findingsNextSteps !== 'skip' && review.findingsNextStepsDetails
                              ? html` <dd>${review.findingsNextStepsDetails}</dd>`
                              : ''
                          }
                          <dd>
                            <a href="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}"
                              >${t('changeClearDiscussion')(visuallyHidden)}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt>${t('advanceKnowledge')()}</dt>
                          <dd>
                            ${Match.value(review.novel).pipe(
                              Match.literalsExhaustive({
                                no: t('advanceKnowledgeNotAtAllLikely'),
                                limited: t('advanceKnowledgeNotLikely'),
                                some: t('advanceKnowledgeModeratelyLikely'),
                                substantial: t('advanceKnowledgeSomewhatLikely'),
                                highly: t('advanceKnowledgeHighlyLikely'),
                                skip: t('iDoNotKnow'),
                              }),
                            )}
                          </dd>
                          ${review.novel !== 'skip' && review.novelDetails ? html` <dd>${review.novelDetails}</dd>` : ''}
                          <dd>
                            <a href="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}"
                              >${t('changeAdvanceKnowledge')(visuallyHidden)}</a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>${t('benefitFromEditing')()}</dt>
                          <dd>
                            ${Match.value(review.languageEditing).pipe(
                              Match.literalsExhaustive({
                                no: t('no'),
                                yes: t('yes'),
                              }),
                            )}
                          </dd>
                          ${review.languageEditingDetails ? html` <dd>${review.languageEditingDetails}</dd>` : ''}
                          <dd>
                            <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}"
                              >${t('changeBenefitFromEditing')(visuallyHidden)}</a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>${t('wouldRecommend')()}</dt>
                          <dd>
                            ${Match.value(review.shouldRead).pipe(
                              Match.literalsExhaustive({
                                no: t('wouldRecommendNo'),
                                'yes-but': t('wouldRecommendYesImproved'),
                                yes: t('wouldRecommendYes'),
                              }),
                            )}
                          </dd>
                          ${review.shouldReadDetails ? html` <dd>${review.shouldReadDetails}</dd>` : ''}
                          <dd>
                            <a href="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}"
                              >${t('changeWouldRecommend')(visuallyHidden)}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt>${t('readyForAttention')()}</dt>
                          <dd>
                            ${Match.value(review.readyFullReview).pipe(
                              Match.literalsExhaustive({
                                no: t('readyForAttentionNo'),
                                'yes-changes': t('readyForAttentionMinorChanges'),
                                yes: t('readyForAttentionYes'),
                              }),
                            )}
                          </dd>
                          ${review.readyFullReviewDetails ? html` <dd>${review.readyFullReviewDetails}</dd>` : ''}
                          <dd>
                            <a href="${format(writeReviewReadyFullReviewMatch.formatter, { id: preprint.id })}"
                              >${t('changeReadyForAttention')(visuallyHidden)}</a
                            >
                          </dd>
                        </div>
                      </dl>
                    `
              }
            </div>
          </div>

          <h2>${t('nowPublish')()}</h2>

          <p>
            ${t('weWillAssignLicense')({
              licenseLink: Match.value(getLicense(review)).pipe(
                Match.literalsExhaustive({
                  'CC0-1.0': () =>
                    html`<a href="https://creativecommons.org/publicdomain/zero/1.0/"
                      ><bdi translate="no">CC0&nbsp;1.0</bdi></a
                    >`,
                  'CC-BY-4.0': () =>
                    html`<a href="https://creativecommons.org/licenses/by/4.0/"
                      ><bdi translate="no">CC&nbsp;BY&nbsp;4.0</bdi></a
                    >`,
                }),
              ),
            })}
          </p>

          <button>${t('publishButton')()}</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    js: ['single-use-form.js', 'error-summary.js', 'notification-banner.js'],
  })
}

const displayAuthor = Prereviewers.matchPersona({
  onPublic: persona =>
    html`<a
      href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      class="orcid"
      dir="auto"
      >${persona.displayName}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" dir="auto"
      >${persona.pseudonym}</a
    >`,
})

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
