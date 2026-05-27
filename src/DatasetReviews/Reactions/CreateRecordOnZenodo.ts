import { Effect } from 'effect'
import * as Datasets from '../../Datasets/index.ts'
import { ZenodoRecords } from '../../ExternalInteractions/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as PublicUrl from '../../public-url.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const CreateRecordOnZenodo = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const datasetReview = yield* Queries.getDataForZenodoRecord(datasetReviewId)

    const { author, otherAuthors, dataset, url } = yield* Effect.all(
      {
        author: Personas.getPersona(datasetReview.author),
        otherAuthors: Effect.forEach(datasetReview.otherAuthors ?? [], Personas.getPersona, { concurrency: 'inherit' }),
        dataset: Datasets.getDatasetTitle(datasetReview.dataset),
        url: PublicUrl.forRoute(Routes.DatasetReview, { datasetReviewId }),
      },
      { concurrency: 'inherit' },
    )

    const recordId = yield* ZenodoRecords.createRecordForDatasetReview({
      ...datasetReview,
      author,
      otherAuthors,
      anonymousAuthors: datasetReview.anonymousAuthors ?? 0,
      dataset,
      url,
    })

    yield* Commands.markRecordCreatedOnZenodo({ recordId, datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToCreateRecordOnZenodo({ cause: error })),
)
