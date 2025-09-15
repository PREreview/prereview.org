import { Effect } from 'effect'
import * as Personas from '../../Personas/index.js'
import type { Uuid } from '../../types/index.js'
import * as Zenodo from '../../Zenodo/index.js'
import * as Commands from '../Commands/index.js'
import * as Errors from '../Errors.js'
import * as Queries from '../Queries/index.js'

export const CreateRecordOnZenodo = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid) {
    const datasetReview = yield* Queries.getDataForZenodoRecord(datasetReviewId)

    const author = yield* Personas.getPersona(datasetReview.author)

    const recordId = yield* Zenodo.createRecordForDatasetReview({ ...datasetReview, author })

    yield* Commands.markRecordCreatedOnZenodo({ recordId, datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToCreateRecordOnZenodo({ cause: error })),
)
