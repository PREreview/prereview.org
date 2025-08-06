import type { Temporal } from '@js-temporal/polyfill'
import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.js'
import { DefaultLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import * as Routes from '../routes.js'
import { renderDate } from '../time.js'
import { Doi, type Orcid, ProfileId, Pseudonym, type Uuid } from '../types/index.js'

export interface DatasetReview {
  author: {
    name: string
    orcid?: Orcid.Orcid
  }
  doi: Doi.Doi
  id: Uuid.Uuid
  questions: {
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
  }
  published: Temporal.PlainDate
}

export const createDatasetReviewPage = ({ datasetReview }: { datasetReview: DatasetReview }) => {
  return PageResponse({
    title: plainText`Structured PREreview of “Metadata collected from 500 articles in the field of ecology and evolution”`,
    description: plainText`Authored by ${datasetReview.author.name}`,
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
