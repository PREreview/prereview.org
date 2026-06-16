import { Array, flow, Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Datasets from '../../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import { ProfileId } from '../../../types/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export type DatasetReviewPreview = Omit<DatasetReviews.DatasetReviewPreview, 'author' | 'dataset'> & {
  readonly author: Option.Option<Personas.Persona>
  readonly dataset: Datasets.DatasetTitle
}

const visuallyHidden = (s: Html) => html`<span class="visually-hidden">${s}</span>`

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
        >${t('forms', 'backLink')()}</a
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
                <dt>${t('title')()}</dt>
                <dd>
                  <cite ${languageAttributesFor(review.dataset.language)}>${review.dataset.title}</cite>
                </dd>
              </div>
              <div>
                <dt>${t('repository')()}</dt>
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
                      <dt>${t('publishedName')()}</dt>
                      <dd>${displayAuthor(author)}</dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId })}">
                          ${t('changePublishedName')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>

                    <div>
                      <dt>${t('competingInterests')()}</dt>
                      <dd>${Option.getOrElse(review.competingInterests, () => html`<i>${t('noneDeclared')()}</i>`)}</dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetDeclareCompetingInterests.href({ datasetReviewId })}">
                          ${t('changeCompetingInterests')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>`,
          })}
          ${review.authorsToInvite
            ? html`
                <div class="summary-card">
                  <div>
                    <h2 id="invited-authors-label">Invited authors</h2>

                    <a
                      href="${Option.match(review.authorsToInvite, {
                        onNone: () => Routes.ReviewADatasetOthersNeedToBeListedOnTheReview,
                        onSome: () => Routes.ReviewADatasetCheckInvitationsToAppear,
                      }).href({ datasetReviewId })}"
                      >Change <span class="visually-hidden">invited authors</span></a
                    >
                  </div>

                  <div aria-labelledby="invited-authors-label" role="region">
                    ${Option.match(review.authorsToInvite, {
                      onNone: () => html`None`,
                      onSome: formatList(locale),
                    })}
                  </div>
                </div>
              `
            : ''}

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
                      <dt>${t('rateQuality')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(rating),
                          Match.when('excellent', t('excellent')),
                          Match.when('fair', t('fair')),
                          Match.when('poor', t('poor')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId })}">
                          ${t('changeQualityRating')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                <div>
                  <dt>${t('followFairAndCare')()}</dt>
                  <dd>
                    ${pipe(
                      Match.value(review.answerToIfTheDatasetFollowsFairAndCarePrinciples.answer),
                      Match.when('yes', t('yes')),
                      Match.when('partly', t('partly')),
                      Match.when('no', t('no')),
                      Match.when('unsure', t('doNotKnow')),
                      Match.exhaustive,
                    )}
                  </dd>
                  ${Option.match(review.answerToIfTheDatasetFollowsFairAndCarePrinciples.detail, {
                    onNone: () => '',
                    onSome: detail => html`<dd>${detail}</dd>`,
                  })}
                  <dd>
                    <a href="${Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId })}">
                      ${t('changeFairAndCare')({ visuallyHidden })}
                    </a>
                  </dd>
                </div>
                ${Option.match(review.answerToIfTheDatasetHasEnoughMetadata, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('enoughMetadata')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}">
                          ${t('changeEnoughMetadata')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetHasTrackedChanges, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('trackChanges')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}">
                          ${t('changeTrackChanges')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetHasDataCensoredOrDeleted, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('signsOfAlteration')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId })}">
                          ${t('changeSignsOfAlteration')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsAppropriateForThisKindOfResearch, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('suitedForPurpose')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId })}">
                          ${t('changeSuitedForPurpose')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetSupportsRelatedConclusions, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('supportsConclusion')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId })}">
                          ${t('changeSupportsConclusion')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsDetailedEnough, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('granularEnough')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId })}">
                          ${t('changeGranularEnough')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsErrorFree, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('relativelyErrorFree')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('partly', t('partly')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId })}">
                          ${t('changeRelativelyErrorFree')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetMattersToItsAudience, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('howConsequential')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('very-consequential', t('veryConsequential')),
                          Match.when('somewhat-consequential', t('somewhatConsequential')),
                          Match.when('not-consequential', t('notConsequential')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId })}">
                          ${t('changeHowConsequential')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsReadyToBeShared, {
                  onNone: () => '',
                  onSome: ({ answer, detail }) => html`
                    <div>
                      <dt>${t('readyToBeShared')()}</dt>
                      <dd>
                        ${pipe(
                          Match.value(answer),
                          Match.when('yes', t('yes')),
                          Match.when('no', t('no')),
                          Match.when('unsure', t('doNotKnow')),
                          Match.exhaustive,
                        )}
                      </dd>
                      ${Option.match(detail, {
                        onNone: () => '',
                        onSome: detail => html`<dd>${detail}</dd>`,
                      })}
                      <dd>
                        <a href="${Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId })}">
                          ${t('changeReadyToBeShared')({ visuallyHidden })}
                        </a>
                      </dd>
                    </div>
                  `,
                })}
                ${Option.match(review.answerToIfTheDatasetIsMissingAnything, {
                  onNone: () => '',
                  onSome: answerToIfTheDatasetIsMissingAnything => html`
                    <div>
                      <dt>${t('anythingMissing')()}</dt>
                      <dd>
                        ${Option.getOrElse(
                          answerToIfTheDatasetIsMissingAnything,
                          () => html`<i>${t('noAnswer')()}</i>`,
                        )}
                      </dd>
                      <dd>
                        <a href="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}">
                          ${t('changeAnythingMissing')({ visuallyHidden })}
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
  onPublic: persona =>
    html`<a
      href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      class="orcid"
      dir="auto"
      >${persona.name}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" dir="auto"
      >${persona.pseudonym}</a
    >`,
})

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`<bdi>${item}</bdi>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
