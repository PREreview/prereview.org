import type { Temporal } from '@js-temporal/polyfill'
import { type Array, Data, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../../html.ts'
import type { PreprintId } from '../../Preprints/index.ts'
import type { FieldId } from '../../types/field.ts'
import type { SubfieldId } from '../../types/subfield.ts'

export interface ReviewRequests {
  readonly currentPage: number
  readonly totalPages: number
  readonly field?: FieldId
  readonly language?: LanguageCode
  readonly reviewRequests: Array.NonEmptyReadonlyArray<{
    readonly published: Temporal.PlainDate
    readonly fields: ReadonlyArray<FieldId>
    readonly subfields: ReadonlyArray<SubfieldId>
    readonly preprint: {
      readonly id: PreprintId
      readonly language: LanguageCode
      readonly title: Html
    }
  }>
}

export interface GetReviewRequestsEnv {
  getReviewRequests: (args: {
    field?: FieldId
    language?: LanguageCode
    page: number
  }) => TE.TaskEither<ReviewRequestsNotFound | ReviewRequestsAreUnavailable, ReviewRequests>
}

export class ReviewRequestsNotFound extends Data.TaggedError('ReviewRequestsNotFound')<{
  cause?: unknown
}> {}

export class ReviewRequestsAreUnavailable extends Data.TaggedError('ReviewRequestsAreUnavailable')<{
  cause?: unknown
}> {}

export const getReviewRequests = (...args: Parameters<GetReviewRequestsEnv['getReviewRequests']>) =>
  pipe(
    RTE.ask<GetReviewRequestsEnv>(),
    RTE.chainTaskEitherK(({ getReviewRequests }) => getReviewRequests(...args)),
  )
