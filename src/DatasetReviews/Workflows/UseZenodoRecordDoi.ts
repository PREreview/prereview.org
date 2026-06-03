import { Effect } from 'effect'
import { ZenodoRecords } from '../../ExternalInteractions/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'

export const UseZenodoRecordDoi = Effect.fn(
  function* (datasetReviewId: Uuid.Uuid, recordId: number) {
    const doi = yield* ZenodoRecords.getDoiForDatasetReviewRecord(recordId)

    yield* Commands.markDoiAsAssigned({ doi, datasetReviewId })
  },
  Effect.catchAll(error => new Errors.FailedToUseZenodoDoi({ cause: error })),
)
