import { Effect } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'

export const CreateRecordOnZenodo = Effect.fn(function* (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId: Uuid.Uuid,
) {
  return yield* new Errors.FailedToCreateRecordOnZenodo({ cause: 'not implemented' })
})
