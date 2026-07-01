import { Array, flow, identity, Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { LanguageCode } from 'iso-639-1'
import { getClubName } from '../../Clubs/index.ts'
import type * as DatasetReviews from '../../DatasetReviews/index.ts'
import type * as Datasets from '../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { Doi, ProfileId } from '../../types/index.ts'
import { PageResponse } from '../Response/index.ts'

export type DatasetReview = Omit<DatasetReviews.PublishedReview, 'author' | 'otherAuthors' | 'dataset'> & {
  readonly author: Personas.Persona
  readonly otherAuthors: ReadonlyArray<Personas.Persona>
  readonly anonymousAuthors: number
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
    title: plainText(t('structuredReviewTitle')({ dataset: plainText`“${datasetReview.dataset.title}”` })),
    description: Option.match(datasetReview.clubId, {
      onNone: () => plainText(t('authoredBy')({ author: authorList(datasetReview, locale), visuallyHidden: identity })),
      onSome: clubId => plainText`Authored by ${authorList(datasetReview, locale)} of ${getClubName(clubId)}`,
    }),
    nav: html`
      <a href="${Routes.DatasetReviews.href({ datasetId: datasetReview.dataset.id })}" class="back"
        >${t('backLink')()}</a
      >
      <a href="${datasetReview.dataset.url.href}" class="forward">${t('seeDataset')()}</a>
    `,
    main: html`
      <header>
        <h1>
          ${t('structuredReviewTitle')({
            dataset: html`<cite ${languageAttributesFor(datasetReview.dataset.language)}
              >${datasetReview.dataset.title}</cite
            >`,
          })}
        </h1>

        <div class="byline">
          ${Option.match(datasetReview.clubId, {
            onNone: () =>
              t('authoredBy')({
                author: authorList(datasetReview, locale),
                visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`,
              }),
            onSome: clubId =>
              html`<span lang="en" dir="ltr"
                ><span class="visually-hidden">Authored</span> by ${authorList(datasetReview, locale)} of
                ${getClubName(clubId)}</span
              >`,
          })}
        </div>

        <dl>
          <div>
            <dt>${t('published')()}</dt>
            <dd>${renderDate(locale)(datasetReview.published)}</dd>
          </div>
          <div>
            <dt translate="no">DOI</dt>
            <dd>
              <a href="${Doi.toUrl(datasetReview.doi).href}" class="doi" dir="auto" translate="no"
                >${datasetReview.doi}</a
              >
            </dd>
          </div>
          <div>
            <dt>${t('license')()}</dt>
            <dd>
              <a href="https://creativecommons.org/licenses/by/4.0/">
                <dfn>
                  <abbr title="${t('licenseCcBy40')()}"><bdi translate="no">CC BY 4.0</bdi></abbr>
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
            Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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
                Match.when('unsure', () => t('review-a-dataset-flow', 'doNotKnow')()),
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

      <p>
        ${Option.getOrElse(datasetReview.competingInterests, () =>
          datasetReview.anonymousAuthors + datasetReview.otherAuthors.length > 0
            ? 'The authors declare that they have no competing interests.'
            : t('noCompetingInterestsStatement')(),
        )}
      </p>
    `,
    skipToLabel: 'prereview',
    canonical: Routes.DatasetReview.href({ datasetReviewId: datasetReview.id }),
  })
}

const authorList = (datasetReview: DatasetReview, locale: SupportedLocale) => {
  const list = Array.map(Array.make(datasetReview.author, ...datasetReview.otherAuthors), displayAuthor)

  if (datasetReview.anonymousAuthors > 0) {
    list.push(
      translate(locale, 'dataset-review-page', 'otherAuthors')({ otherAuthors: datasetReview.anonymousAuthors }),
    )
  }

  return formatList(locale)(list)
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
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
