import { Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import type * as DatasetReviews from '../DatasetReviews/index.ts'
import type * as Datasets from '../Datasets/index.ts'
import { type Html, html, plainText } from '../html.ts'
import { DefaultLocale } from '../locales/index.ts'
import * as Personas from '../Personas/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import { renderDate } from '../time.ts'
import { Doi, ProfileId } from '../types/index.ts'

export type DatasetReview = Omit<DatasetReviews.PublishedReview, 'author' | 'dataset'> & {
  readonly author: Personas.Persona
  readonly dataset: {
    readonly id: Datasets.DatasetId
    readonly language: LanguageCode
    readonly title: Html
    readonly url: URL
  }
}

export const createDatasetReviewPage = ({ datasetReview }: { datasetReview: DatasetReview }) => {
  return PageResponse({
    title: plainText`Structured PREreview of “${plainText(datasetReview.dataset.title)}”`,
    description: plainText`Authored by ${displayAuthor(datasetReview.author)}`,
    nav: html`
      <a href="${Routes.DatasetReviews.href({ datasetId: datasetReview.dataset.id })}" class="back"
        ><span>Back to all reviews</span></a
      >
      <a href="${plainText(datasetReview.dataset.url.href)}" class="forward"><span>See the dataset</span></a>
    `,
    main: html`
      <header>
        <h1>
          Structured PREreview of
          <cite lang="${datasetReview.dataset.language}" dir="${rtlDetect.getLangDir(datasetReview.dataset.language)}"
            >${datasetReview.dataset.title}</cite
          >
        </h1>

        <div class="byline">
          <span class="visually-hidden">Authored</span> by ${displayAuthor(datasetReview.author)}
        </div>

        <dl>
          <div>
            <dt>Published</dt>
            <dd>${renderDate(DefaultLocale)(datasetReview.published)}</dd>
          </div>
          <div>
            <dt>DOI</dt>
            <dd><a href="${Doi.toUrl(datasetReview.doi).href}" class="doi" translate="no">${datasetReview.doi}</a></dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>
              <a href="https://creativecommons.org/licenses/by/4.0/">
                <dfn>
                  <abbr title="Attribution 4.0 International"><span translate="no">CC BY 4.0</span></abbr>
                </dfn>
              </a>
            </dd>
          </div>
        </dl>
      </header>

      <dl>
        ${Option.match(datasetReview.questions.qualityRating, {
          onNone: () => '',
          onSome: qualityRating => html`
            <dt>How would you rate the quality of this data set?</dt>
            <dd>
              ${pipe(
                Match.value(qualityRating),
                Match.when('excellent', () => 'Excellent'),
                Match.when('fair', () => 'Fair'),
                Match.when('poor', () => 'Poor'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
            ${Option.match(datasetReview.questions.qualityRatingDetail, {
              onNone: () => '',
              onSome: detail => html`<dd>${detail}</dd>`,
            })}
          `,
        })}
        <dt>Does this dataset follow FAIR and CARE principles?</dt>
        <dd>
          ${pipe(
            Match.value(datasetReview.questions.answerToIfTheDatasetFollowsFairAndCarePrinciples),
            Match.when('yes', () => 'Yes'),
            Match.when('partly', () => 'Partly'),
            Match.when('no', () => 'No'),
            Match.when('unsure', () => 'I don’t know'),
            Match.exhaustive,
          )}
        </dd>
        ${Option.match(datasetReview.questions.answerToIfTheDatasetFollowsFairAndCarePrinciplesDetail, {
          onNone: () => '',
          onSome: detail => html`<dd>${detail}</dd>`,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetHasEnoughMetadata, {
          onNone: () => '',
          onSome: answerToIfTheDatasetHasEnoughMetadata => html`
            <dt>Does the dataset have enough metadata?</dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetHasEnoughMetadata),
                Match.when('yes', () => 'Yes'),
                Match.when('partly', () => 'Partly'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetHasTrackedChanges, {
          onNone: () => '',
          onSome: answerToIfTheDatasetHasTrackedChanges => html`
            <dt>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetHasTrackedChanges),
                Match.when('yes', () => 'Yes'),
                Match.when('partly', () => 'Partly'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetHasDataCensoredOrDeleted, {
          onNone: () => '',
          onSome: answerToIfTheDatasetHasDataCensoredOrDeleted => html`
            <dt>
              Does this dataset show signs of alteration beyond instances of likely human error, such as censorship,
              deletion, or redaction, that are not accounted for otherwise?
            </dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetHasDataCensoredOrDeleted),
                Match.when('yes', () => 'Yes'),
                Match.when('partly', () => 'Partly'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsAppropriateForThisKindOfResearch, {
          onNone: () => '',
          onSome: answerToIfTheDatasetIsAppropriateForThisKindOfResearch => html`
            <dt>Is the dataset well-suited to support its stated research purpose?</dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetIsAppropriateForThisKindOfResearch),
                Match.when('yes', () => 'Yes'),
                Match.when('partly', () => 'Partly'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetSupportsRelatedConclusions, {
          onNone: () => '',
          onSome: answerToIfTheDatasetSupportsRelatedConclusions => html`
            <dt>Does this dataset support the researcher’s stated conclusions?</dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetSupportsRelatedConclusions),
                Match.when('yes', () => 'Yes'),
                Match.when('partly', () => 'Partly'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsDetailedEnough, {
          onNone: () => '',
          onSome: answerToIfTheDatasetIsDetailedEnough => html`
            <dt>Is the dataset granular enough to be a reliable standard of measurement?</dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetIsDetailedEnough),
                Match.when('yes', () => 'Yes'),
                Match.when('partly', () => 'Partly'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsErrorFree, {
          onNone: () => '',
          onSome: answerToIfTheDatasetIsErrorFree => html`
            <dt>Is the dataset relatively error-free?</dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetIsErrorFree),
                Match.when('yes', () => 'Yes'),
                Match.when('partly', () => 'Partly'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetMattersToItsAudience, {
          onNone: () => '',
          onSome: answerToIfTheDatasetMattersToItsAudience => html`
            <dt>
              Is this dataset likely to be of interest to researchers in its corresponding field of study, to most
              researchers, or to the general public? How consequential is it likely to seem to that audience or those
              audiences?
            </dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetMattersToItsAudience),
                Match.when('very-consequential', () => 'Very consequential'),
                Match.when('somewhat-consequential', () => 'Somewhat consequential'),
                Match.when('not-consequential', () => 'Not consequential'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsReadyToBeShared, {
          onNone: () => '',
          onSome: answerToIfTheDatasetIsReadyToBeShared => html`
            <dt>Is this dataset ready to be shared?</dt>
            <dd>
              ${pipe(
                Match.value(answerToIfTheDatasetIsReadyToBeShared),
                Match.when('yes', () => 'Yes'),
                Match.when('no', () => 'No'),
                Match.when('unsure', () => 'I don’t know'),
                Match.exhaustive,
              )}
            </dd>
          `,
        })}
        ${Option.match(datasetReview.questions.answerToIfTheDatasetIsMissingAnything, {
          onNone: () => '',
          onSome: answerToIfTheDatasetIsMissingAnything => html`
            <dt>
              What else, if anything, would it be helpful for the researcher to include with this dataset to make it
              easier to find, understand and reuse in ethical and responsible ways?
            </dt>
            <dd>${answerToIfTheDatasetIsMissingAnything}</dd>
          `,
        })}
      </dl>

      <h2>Competing interests</h2>

      <p>
        ${Option.getOrElse(
          datasetReview.competingInterests,
          () => 'The author declares that they have no competing interests.',
        )}
      </p>
    `,
    skipToLabel: 'prereview',
    canonical: Routes.DatasetReview.href({ datasetReviewId: datasetReview.id }),
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
