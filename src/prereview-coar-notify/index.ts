import type * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import type { ReviewRequestPreprintId } from '../review-request'
import type { GenerateUuidEnv } from '../types/uuid'
import { constructCoarPayload } from './construct-coar-payload'
import { sendReviewActionOffer } from './send-review-action-offer'

const hardcodedCoarNotifyUrl = 'https://coar-notify-sandbox.prereview.org'

export const publishToPrereviewCoarNotifyInbox = (
  preprint: ReviewRequestPreprintId,
): RTE.ReaderTaskEither<F.FetchEnv & GenerateUuidEnv, 'unavailable', void> =>
  pipe(
    { coarNotifyUrl: hardcodedCoarNotifyUrl, preprint },
    constructCoarPayload,
    RTE.rightReaderIO,
    RTE.chainW(sendReviewActionOffer),
  )