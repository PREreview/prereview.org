import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type * as ReviewRequests from '../../ReviewRequests/index.ts'
import type { FieldId } from '../../types/field.ts'

export interface GetReviewRequestsEnv {
  getReviewRequests: (args: {
    field?: FieldId
    language?: LanguageCode
    page: number
  }) => TE.TaskEither<
    ReviewRequests.ReviewRequestsNotFound | ReviewRequests.ReviewRequestsAreUnavailable,
    ReviewRequests.PageOfReviewRequests
  >
}

export const getReviewRequests = (...args: Parameters<GetReviewRequestsEnv['getReviewRequests']>) =>
  pipe(
    RTE.ask<GetReviewRequestsEnv>(),
    RTE.chainTaskEitherK(({ getReviewRequests }) => getReviewRequests(...args)),
  )
