import { Effect, Equal } from 'effect'
import { html } from '../html.js'
import { Doi } from '../types/index.js'
import * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'

export const GetDatasetTitle = (
  id: DatasetId.DatasetId,
): Effect.Effect<Dataset.DatasetTitle, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable> =>
  Effect.if(Equal.equals(id.value, Doi.Doi('10.5061/dryad.wstqjq2n3')), {
    onFalse: () => new Dataset.DatasetIsUnavailable({ cause: 'not implemented' }),
    onTrue: () =>
      Effect.succeed(
        new Dataset.DatasetTitle({
          id,
          title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
          language: 'en',
        }),
      ),
  })
