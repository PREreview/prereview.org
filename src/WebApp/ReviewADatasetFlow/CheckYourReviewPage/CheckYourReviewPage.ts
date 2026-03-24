import { Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Datasets from '../../../Datasets/index.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import { ProfileId } from '../../../types/index.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export type DatasetReviewPreview = Omit<DatasetReviews.DatasetReviewPreview, 'author' | 'dataset'> & {
  readonly author: Option.Option<Personas.Persona>
  readonly dataset: Datasets.DatasetTitle
}

const visuallyHidden = (s: string) => `<span class="visually-hidden">${s}</span>`

export const CheckYourReviewPage = ({
  datasetReviewId,
  review,
  locale,
}: {
  datasetReviewId: Uuid
  review: DatasetReviewPreview
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'review-a-dataset-flow')
  return StreamlinePageResponse({
    title: pipe(t('checkYourPrereview')(), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetDeclareFollowingCodeOfConduct.href({ datasetReviewId })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <single-use-form>
        <form method="post" action="${Routes.ReviewADatasetCheckYourReview.href({ datasetReviewId })}" novalidate>
          <h1>${t('checkYourPrereview')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${t('datasetDetails')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>${t('title')()}</span></dt>
                <dd>
                  <cite lang="${review.dataset.language}" dir="${rtlDetect.getLangDir(review.dataset.language)}"
                    >${review.dataset.title}</cite
                  >
                </dd>
              </div>
              <div>
                <dt><span>${t('repository')()}</span></dt>
                <dd>${Datasets.getRepositoryName(review.dataset.id)}</dd>
              </div>
            </dl>
          </div>

          ${Option.match(review.author, {
            onNone: () => '',
            onSome: author =>
              html` <div class="summary-card">
                <div>
                  <h2 id="details-label">${t('yourDetails')()}</h2>
                </div>

                <div aria-labelledby="details-label" role="region">
                  <dl class="summary-list">
                    <div>
                      <dt><span>${t('publishedName')()}</span></dt>
                      <dd>${displayAuthor(author)}</dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId })}">
                          ${rawHtml(t('changePublishedName')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>

                    <div>
                      <dt><span>${t('competingInterests')()}</span></dt>
                      <dd>${Option.getOrElse(review.competingInterests, () => html`<i>${t('noneDeclared')()}</i>`)}</dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetDeclareCompetingInterests.href({ datasetReviewId })}">
                          ${rawHtml(t('changeCompetingInterests')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>`,
          })}

          <div class="summary-card">
            <div>
              <h2 id="review-label">${t('yourReview')()}</h2>
            </div>

            <div aria-labelledby="review-label" role="region">
              <dl class="summary-list">
                ${Option.match(review.qualityRating, {
                  onNone: () => '',
                  onSome: ({ rating, detail }) => html`
                    <div>
                      <dt><span>${t('rateQuality')()}</span></dt>
                      <dd>
                        ${pipe(
                          Match.value(rating),
                          Match.when('excellent', t('excellent')),
                          Match.when('fair', t('fair')),
                          Match.when('poor', t('poor')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId })}">
                          ${rawHtml(t('changeQualityRating')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                <div>
                  <dt><span>${t('followFairAndCare')()}</span></dt>
                  <dd>
                    ${pipe(
                      Match.value(review.answerToIfTheDatasetFollowsFairAndCarePrinciples.answer),
                      Match.when('yes', t('yes')),
                      Match.when('partly', t('partly')),
                      Match.when('no', t('no')),
                      Match.when('unsure', t('dontKnow')),
                      Match.exhaustive,
                    )}
                  </dd>
                  ${Option.match(review.answerToIfTheDatasetFollowsFairAndCarePrinciples.detail, {
                    onNone: () => '',
                    onSome: detail => html`<dd>${detail}</dd>`,
                  })}
                  <dd>
                    <a href="${Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId })}">
                      ${rawHtml(t('changeFairAndCare')({ visuallyHidden }))}
                    </a>
                  </dd>
                </div>
                ${Option.match(review.answerToIfTheDatasetHasEnoughMetadata, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt><span>${t('enoughMetadata')()}</span></dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}">
                          ${rawHtml(t('changeEnoughMetadata')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetHasTrackedChanges, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('trackChanges')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}">
                          ${rawHtml(t('changeTrackChanges')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetHasDataCensoredOrDeleted, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('signsOfAlteration')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId })}">
                          ${rawHtml(t('changeSignsOfAlteration')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsAppropriateForThisKindOfResearch, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('suitedForPurpose')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId })}">
                          ${rawHtml(t('changeSuitedForPurpose')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetSupportsRelatedConclusions, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('supportsConclusion')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId })}">
                          ${rawHtml(t('changeSupportsConclusion')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsDetailedEnough, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('granularEnough')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId })}">
                          ${rawHtml(t('changeGranularEnough')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsErrorFree, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('relativelyErrorFree')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId })}">
                          ${rawHtml(t('changeRelativelyErrorFree')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetMattersToItsAudience, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('howConsequential')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('very-consequential', t('veryConsequential')),
                          Match.when('somewhat-consequential', t('somewhatConsequential')),
                          Match.when('not-consequential', t('notConsequential')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId })}">
                          ${rawHtml(t('changeHowConsequential')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsReadyToBeShared, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>
                        <span>${t('readyToBeShared')()}</span>
                      </dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('dontKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId })}">
                          ${rawHtml(t('changeReadyToBeShared')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsMissingAnything, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetIsMissingAnything => html`
                    <div>
                      <dt>
                        <span>${t('anythingMissing')()}</span>
                      </dt>
                      <dd>
                        ${Option.getOrElse(
                          answerToIfTheDatasetIsMissingAnything,
                          () => html`<i>${t('noAnswer')()}</i>`,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}">
                          ${rawHtml(t('changeAnythingMissing')({ visuallyHidden }))}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
              </dl>
            </div>
          </div>

          <h2>${t('nowPublish')()}</h2>

          <button>${t('publishPrereview')()}</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
}

const displayAuthor = Personas.match({
  onPublic: ({ name, orcidId }) =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forOrcid(orcidId) })}" class="orcid"
      >${name}</a
    >`,
  onPseudonym: ({ pseudonym }) =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPseudonym(pseudonym) })}"
      >${pseudonym}</a
    >`,
})
