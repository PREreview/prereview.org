import { identity, Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import type * as DatasetReviews from '../../DatasetReviews/index.ts'
import type * as Datasets from '../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { Doi, ProfileId } from '../../types/index.ts'
import { PageResponse } from '../Response/index.ts'

export type DatasetReview = Omit<DatasetReviews.PublishedReview, 'author' | 'dataset'> & {
  readonly author: Personas.Persona
  readonly dataset: {
    readonly id: Datasets.DatasetId
    readonly language: LanguageCode
    readonly title: Html
    readonly url: URL
  }
}

export const createDatasetReviewPage = ({
  datasetReview,
  locale,
}: {
  datasetReview: DatasetReview
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'dataset-review-page')

  return PageResponse({
    title: plainText(t('structuredReviewTitle')({ dataset: plainText`“${datasetReview.dataset.title}”`.toString() })),
    description: plainText(
      t('authoredBy')({ author: displayAuthor(datasetReview.author).toString(), visuallyHidden: identity }),
    ),
    nav: html`
      <a href="${Routes.DatasetReviews.href({ datasetId: datasetReview.dataset.id })}" class="back"
        ><span>${t('backLink')()}</span></a
      >
      <a href="${plainText(datasetReview.dataset.url.href)}" class="forward"><span>${t('seeDataset')()}</span></a>
    `,
    main: html`
      <header>
        <h1>
          ${rawHtml(
            t('structuredReviewTitle')({
              dataset: html`<cite
                lang="${datasetReview.dataset.language}"
                dir="${rtlDetect.getLangDir(datasetReview.dataset.language)}"
                >${datasetReview.dataset.title}</cite
              >`.toString(),
            }),
          )}
        </h1>

        <div class="byline">
          ${rawHtml(
            t('authoredBy')({
              author: displayAuthor(datasetReview.author).toString(),
              visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString(),
            }),
          )}
        </div>

        <dl>
          <div>
            <dt>${t('published')()}</dt>
            <dd>${renderDate(locale)(datasetReview.published)}</dd>
          </div>
          <div>
            <dt>DOI</dt>
            <dd><a href="${Doi.toUrl(datasetReview.doi).href}" class="doi" translate="no">${datasetReview.doi}</a></dd>
          </div>
          <div>
            <dt>${t('license')()}</dt>
            <dd>
              <a href="https://creativecommons.org/licenses/by/4.0/">
                <dfn>
                  <abbr title="${t('licenseCcBy40')()}"><span translate="no">CC BY 4.0</span></abbr>
                </dfn>
              </a>
            </dd>
          </div>
        </dl>
      </header>

      <dl>
        ${Option.match(datasetReview.questions.qualityRating, {
          onNone: () => '',
          onSome: ({ rating, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'rateQuality')()}</dt>
            <dd>
              ${pipe(
                Match.value(rating),
                Match.when('excellent', () => t('review-a-dataset-flow', 'excellent')()),
                Match.when('fair', () => t('review-a-dataset-flow', 'fair')()),
                Match.when('poor', () => t('review-a-dataset-flow', 'poor')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        <dt>${t('review-a-dataset-flow', 'followFairAndCare')()}</dt>
        <dd>
          ${pipe(
            Match.value(datasetReview.questions.answerToIfTheDatasetFollowsFairAndCarePrinciples.answer),
            Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
            Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
            Match.when('no', () => t('review-a-dataset-flow', 'no')()),
            Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
            Match.exhaustive,
          )}
        </dd>
        ${Option.match(datasetReview.questions.answerToIfTheDatasetFollowsFairAndCarePrinciples.detail, {
          onNone: () => '',
          onSome: detail => html`<dd>${detail}</dd>`,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetHasEnoughMetadata, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'enoughMetadata')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetHasTrackedChanges, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'trackChanges')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetHasDataCensoredOrDeleted, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'signsOfAlteration')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsAppropriateForThisKindOfResearch, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'suitedForPurpose')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetSupportsRelatedConclusions, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'supportsConclusion')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsDetailedEnough, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'granularEnough')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsErrorFree, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'relativelyErrorFree')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('partly', () => t('review-a-dataset-flow', 'partly')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetMattersToItsAudience, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'howConsequential')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('very-consequential', () => t('review-a-dataset-flow', 'veryConsequential')()),
                Match.when('somewhat-consequential', () => t('review-a-dataset-flow', 'somewhatConsequential')()),
                Match.when('not-consequential', () => t('review-a-dataset-flow', 'notConsequential')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsReadyToBeShared, {
          onNone: () => '',
          onSome: ({ answer, detail }) => html`
            <dt>${t('review-a-dataset-flow', 'readyToBeShared')()}</dt>
            <dd>
              ${pipe(
                Match.value(answer),
                Match.when('yes', () => t('review-a-dataset-flow', 'yes')()),
                Match.when('no', () => t('review-a-dataset-flow', 'no')()),
                Match.when('unsure', () => t('review-a-dataset-flow', 'dontKnow')()),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(detail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsMissingAnything, {
          onNone: () => '',
          onSome: answerToIfTheDatasetIsMissingAnything => html`
            <dt>${t('review-a-dataset-flow', 'anythingMissing')()}</dt>
            <dd>${answerToIfTheDatasetIsMissingAnything}</dd>
          `,
        })}
      </dl>

      <h2>${t('competingInterests')()}</h2>

      <p>${Option.getOrElse(datasetReview.competingInterests, () => t('noCompetingInterestsStatement')())}</p>
    `,
    skipToLabel: 'prereview',
    canonical: Routes.DatasetReview.href({ datasetReviewId: datasetReview.id }),
  })
}

const displayAuthor = Personas.match({
  onPublic: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" class="orcid"
      >${persona.name}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      >${persona.pseudonym}</a
    >`,
})
