import { Temporal } from '@js-temporal/polyfill'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html'
import type { FieldId } from '../types/field'
import type { PreprintId } from '../types/preprint-id'
import type { SubfieldId } from '../types/subfield'

import PlainDate = Temporal.PlainDate

export interface ReviewRequests {
  readonly currentPage: number
  readonly totalPages: number
  readonly field?: FieldId
  readonly language?: LanguageCode
  readonly reviewRequests: RNEA.ReadonlyNonEmptyArray<{
    readonly published: PlainDate
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
  }) => TE.TaskEither<'not-found' | 'unavailable', ReviewRequests>
}

export const getReviewRequests = (...args: Parameters<GetReviewRequestsEnv['getReviewRequests']>) =>
  pipe(
    RTE.ask<GetReviewRequestsEnv>(),
    RTE.chainTaskEitherK(({ getReviewRequests }) => getReviewRequests(...args)),
  )
