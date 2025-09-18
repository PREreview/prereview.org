import { Temporal } from '@js-temporal/polyfill'
import { Effect, Equal } from 'effect'
import { html } from '../html.js'
import { Doi } from '../types/index.js'
import * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'

export const GetDataset = (
  id: DatasetId.DatasetId,
): Effect.Effect<Dataset.Dataset, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable> =>
  Effect.if(Equal.equals(id.value, Doi.Doi('10.5061/dryad.wstqjq2n3')), {
    onFalse: () => new Dataset.DatasetIsUnavailable({ cause: 'not implemented' }),
    onTrue: () =>
      Effect.succeed(
        new Dataset.Dataset({
          abstract: {
            text: html`
              <p>
                The submitted dataset contains the metadata collected from 500 articles in the field of ecology and
                evolution. This includes articles from the following journals: Ecology and Evolution, PLoS One,
                Proceedings of the Royal Society B, Ecology and the preprint server bioRxiv. Direct identifiers have
                been removed from the dataset. These included the first and last names of authors. No more than three
                indirect identifiers have been provided. Information found herein includes article titles, number of
                authors and ECR status, among others. A README file has been attached to provide greater details about
                the dataset.
              </p>
            `,
            language: 'en',
          },
          authors: [
            { name: 'Jesse Wolf' },
            { name: 'Layla MacKay' },
            { name: 'Sarah Haworth' },
            { name: 'Morgan Dedato' },
            { name: 'Kiana Young' },
            { name: 'Marie-Laurence Cossette' },
            { name: 'Colin Elliott' },
            { name: 'Rebekah Oomen' },
          ],
          id,
          posted: Temporal.PlainDate.from('2022-09-02'),
          title: {
            text: html`Metadata collected from 500 articles in the field of ecology and evolution`,
            language: 'en',
          },
          url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
        }),
      ),
  })
