import type { Effect } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'

export const UseZenodoRecordDoi: (
  datasetReviewId: Uuid.Uuid,
  recordId: number,
) => Effect.Effect<void, Errors.FailedToGetDoiFromZenodo> = () =>
  new Errors.FailedToGetDoiFromZenodo({ cause: 'not implemented' })
