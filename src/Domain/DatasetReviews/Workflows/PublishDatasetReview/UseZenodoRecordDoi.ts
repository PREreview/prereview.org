import { Effect } from 'effect'
import type { Doi } from '../../../../types/Doi.ts'
import type { Uuid } from '../../../../types/index.ts'
import * as Commands from '../../Commands/index.ts'
import * as Errors from '../../Errors.ts'

export const UseZenodoRecordDoi = Effect.fn('DatasetReviews.useZenodoRecordDoi')(
  function* (datasetReviewId: Uuid.Uuid, doi: Doi) {
    yield* Commands.markDoiAsAssigned({ doi, datasetReviewId })
  },
  Effect.catch(error => new Errors.FailedToUseZenodoDoi({ cause: error })),
)
