import { Temporal } from '@js-temporal/polyfill'
import * as RT from 'fp-ts/ReaderTask'
import type * as T from 'fp-ts/Task'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html'
import type { FieldId } from '../types/field'
import type { PreprintId } from '../types/preprint-id'
import type { SubfieldId } from '../types/subfield'

import PlainDate = Temporal.PlainDate

export interface RecentReviewRequest {
  readonly published: PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export interface GetRecentReviewRequestsEnv {
  getRecentReviewRequests: () => T.Task<ReadonlyArray<RecentReviewRequest>>
}

export const getRecentReviewRequests = () =>
  pipe(
    RT.ask<GetRecentReviewRequestsEnv>(),
    RT.chainTaskK(({ getRecentReviewRequests }) => getRecentReviewRequests()),
  )
