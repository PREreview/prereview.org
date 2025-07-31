import { Effect } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Zenodo from '../../Zenodo/index.js'
import * as Commands from '../Commands/index.js'
import * as Errors from '../Errors.js'

export const UseZenodoRecordDoi = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid, recordId: number) {
    const doi = yield* Zenodo.getDoiForDatasetReviewRecord(recordId)

    yield* Commands.markDoiAsAssigned({ doi, datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToUseZenodoDoi({ cause: error })),
)
