import { Array, Struct } from 'effect'
import type * as DatasetReviews from '../DatasetReviews/index.js'
import { html, plainText } from '../html.js'
import * as Personas from '../Personas/index.js'
import { TwoUpPageResponse } from '../response.js'
import * as Routes from '../routes.js'

export type DatasetReview = DatasetReviews.PublishedReview

export const createDatasetReviewsPage = ({ datasetReviews }: { datasetReviews: ReadonlyArray<DatasetReview> }) => {
  return TwoUpPageResponse({
    title: plainText`PREreviews of “Metadata collected from 500 articles in the field of ecology and evolution”`,
    description: plainText`Authored by Jesse Wolf, Layla MacKay, Sarah Haworth, Morgan Dedato, Kiana Young, Marie-Laurence Cossette, Colin Elliott and Rebekah Oomen

Abstract

The submitted dataset contains the metadata collected from 500 articles in the field of ecology and evolution. This includes articles from the following journals: Ecology and Evolution, PLoS One, Proceedings of the Royal Society B, Ecology and the preprint server bioRxiv. Direct identifiers have been removed from the dataset. These included the first and last names of authors. No more than three indirect identifiers have been provided. Information found herein includes article titles, number of authors and ECR status, among others. A README file has been attached to provide greater details about the dataset.
      `,
    h1: html`PREreviews of <cite>Metadata collected from 500 articles in the field of ecology and evolution</cite>`,
    aside: html`
      <article aria-labelledby="dataset-title">
        <header>
          <h2 id="dataset-title">Metadata collected from 500 articles in the field of ecology and evolution</h2>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by Jesse Wolf, Layla MacKay, Sarah Haworth, Morgan Dedato,
            Kiana Young, Marie-Laurence Cossette, Colin Elliott and Rebekah Oomen
          </div>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>September 2, 2022</dd>
            </div>
            <div>
              <dt>Repository</dt>
              <dd>Dryad</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi" translate="no">10.5061/dryad.wstqjq2n3</dd>
            </div>
          </dl>
        </header>

        <h3>Abstract</h3>

        <p>
          The submitted dataset contains the metadata collected from 500 articles in the field of ecology and evolution.
          This includes articles from the following journals: Ecology and Evolution, PLoS One, Proceedings of the Royal
          Society B, Ecology and the preprint server bioRxiv. Direct identifiers have been removed from the dataset.
          These included the first and last names of authors. No more than three indirect identifiers have been
          provided. Information found herein includes article titles, number of authors and ECR status, among others. A
          README file has been attached to provide greater details about the dataset.
        </p>

        <a href="https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3" class="button">See the dataset</a>
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
    canonical: Routes.DatasetReviews,
    type: 'dataset',
  })
}

const displayAuthor = Personas.match({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})
