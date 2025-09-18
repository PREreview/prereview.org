import { Array, flow, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import type * as DatasetReviews from '../DatasetReviews/index.js'
import type * as Datasets from '../Datasets/index.js'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../html.js'
import { DefaultLocale } from '../locales/index.js'
import * as Personas from '../Personas/index.js'
import { TwoUpPageResponse } from '../response.js'
import * as Routes from '../routes.js'
import { renderDate } from '../time.js'
import { Doi, type OrcidId, ProfileId } from '../types/index.js'

export type DatasetReview = Omit<DatasetReviews.PublishedReview, 'author'> & {
  readonly author: Personas.Persona
}

export const createDatasetReviewsPage = ({
  dataset,
  datasetReviews,
}: {
  dataset: Datasets.Dataset
  datasetReviews: ReadonlyArray<DatasetReview>
}) => {
  return TwoUpPageResponse({
    title: plainText`PREreviews of “${plainText(dataset.title.text)}”`,
    description: plainText`Authored by ${pipe(dataset.authors, Array.map(displayDatasetAuthor), formatList(DefaultLocale))}
    ${
      dataset.abstract
        ? plainText`
          Abstract

          ${dataset.abstract.text}
        `
        : ''
    }
      `,
    h1: html`PREreviews of
      <cite lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}"
        >${dataset.title.text}</cite
      >`,
    aside: html`
      <article aria-labelledby="dataset-title">
        <header>
          <h2 id="dataset-title" lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}">
            ${dataset.title.text}
          </h2>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(dataset.authors, Array.map(displayDatasetAuthor), formatList(DefaultLocale))}
          </div>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>${renderDate(DefaultLocale)(dataset.posted)}</dd>
            </div>
            <div>
              <dt>Repository</dt>
              <dd>Dryad</dd>
            </div>

            <div>
              <dt>DOI</dt>
              <dd><a href="${Doi.toUrl(dataset.id.value).href}" class="doi" translate="no">${dataset.id.value}</a></dd>
            </div>
          </dl>
        </header>

        ${dataset.abstract
          ? html`
              <h3>Abstract</h3>

              <div lang="${dataset.abstract.language}" dir="${rtlDetect.getLangDir(dataset.abstract.language)}">
                ${fixHeadingLevels(3, dataset.abstract.text)}
              </div>
            `
          : ''}

        <a href="${dataset.url.href}" class="button">See the dataset</a>
      </article>
    `,
    main: html`
      <h2>${datasetReviews.length} PREreview${datasetReviews.length === 1 ? '' : 's'}</h2>

      <div class="button-group" role="group">
        <a href="${Routes.ReviewThisDataset}" class="button">Write a PREreview</a>
      </div>

      ${Array.match(datasetReviews, {
        onEmpty: () => '',
        onNonEmpty: datasetReviews => html`
          <ol class="cards">
            ${Array.map(
              datasetReviews,
              datasetReview => html`
                <li>
                  <article aria-labelledby="prereview-${datasetReview.id}-title">
                    <header>
                      <h3 class="visually-hidden" id="prereview-${datasetReview.id}-title">
                        PREreview by ${displayAuthor(datasetReview.author)}
                      </h3>

                      <div class="byline">
                        <span class="visually-hidden">Authored</span> by ${displayAuthor(datasetReview.author)}
                      </div>
                    </header>

                    <a href="${Routes.DatasetReview.href({ datasetReviewId: datasetReview.id })}" class="more">
                      Read
                      <span class="visually-hidden">the PREreview by ${displayAuthor(datasetReview.author)}</span>
                    </a>
                  </article>
                </li>
              `,
            )}
          </ol>
        `,
      })}
    `,
    canonical: Routes.DatasetReviews.href({ datasetId: dataset.id }),
    type: 'dataset',
  })
}

const displayAuthor = Personas.match({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})

function displayDatasetAuthor({ name, orcidId }: { name: string; orcidId?: OrcidId.OrcidId }) {
  if (orcidId) {
    return html`<a
      href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forOrcid(orcidId) })}"
      class="orcid"
      >${name}</a
    >`
  }

  return name
}

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
