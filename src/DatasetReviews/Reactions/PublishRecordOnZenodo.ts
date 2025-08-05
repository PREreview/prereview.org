import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PublishRecordOnZenodo = (datasetReviewId: Uuid.Uuid) =>
  new Errors.FailedToPublishRecordOnZenodo({ cause: 'not implemented' })
