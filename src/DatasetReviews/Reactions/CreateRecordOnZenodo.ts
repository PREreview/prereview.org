import { Effect } from 'effect'
import * as Datasets from '../../Datasets/index.ts'
import * as Personas from '../../Personas/index.ts'
import { PublicUrl } from '../../public-url.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'
import * as Zenodo from '../../Zenodo/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const CreateRecordOnZenodo = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const publicUrl = yield* PublicUrl

    const datasetReview = yield* Queries.getDataForZenodoRecord(datasetReviewId)

    const { author, dataset } = yield* Effect.all(
      {
        author: Personas.getPersona(datasetReview.author),
        dataset: Datasets.getDatasetTitle(datasetReview.dataset),
      },
      { concurrency: 'inherit' },
    )

    const url = new URL(`${publicUrl.origin}${Routes.DatasetReview.href({ datasetReviewId })}`)

    const recordId = yield* Zenodo.createRecordForDatasetReview({ ...datasetReview, author, dataset, url })

    yield* Commands.markRecordCreatedOnZenodo({ recordId, datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToCreateRecordOnZenodo({ cause: error })),
)
