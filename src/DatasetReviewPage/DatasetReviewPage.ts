import { Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as DatasetReviews from '../DatasetReviews/index.js'
import { html, plainText } from '../html.js'
import { DefaultLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import * as Routes from '../routes.js'
import { renderDate } from '../time.js'
import { Doi, type Orcid, ProfileId, Pseudonym } from '../types/index.js'

export const createDatasetReviewPage = ({ datasetReview }: { datasetReview: DatasetReviews.PublishedReview }) => {
  return PageResponse({
    title: plainText`Structured PREreview of “Metadata collected from 500 articles in the field of ecology and evolution”`,
    description: plainText`Authored by ${datasetReview.author.name}`,
    nav: html`
      <a href="${Routes.DatasetReviews}" class="back"><span>Back to all reviews</span></a>
      <a href="https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3" class="forward"
        ><span>See the dataset</span></a
      >
    `,
    main: html`
      <header>
        <h1>Structured PREreview of “Metadata collected from 500 articles in the field of ecology and evolution”</h1>

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
    `,
    skipToLabel: 'prereview',
    canonical: Routes.DatasetReview.href({ datasetReviewId: datasetReview.id }),
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid.Orcid }) {
  if (orcid) {
    return html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  if (Pseudonym.isPseudonym(name)) {
    return html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}"
      >${name}</a
    >`
  }

  return name
}
