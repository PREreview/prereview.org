import { Effect } from 'effect'
import * as Personas from '../../Personas/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Zenodo from '../../Zenodo/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const CreateRecordOnZenodo = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const datasetReview = yield* Queries.getDataForZenodoRecord(datasetReviewId)

    const author = yield* Personas.getPersona(datasetReview.author)

    const recordId = yield* Zenodo.createRecordForDatasetReview({ ...datasetReview, author })

    yield* Commands.markRecordCreatedOnZenodo({ recordId, datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToCreateRecordOnZenodo({ cause: error })),
)
