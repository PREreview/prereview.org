import type { Temporal } from '@js-temporal/polyfill'
import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'

export interface RecentReviewRequest {
  readonly published: Temporal.PlainDate
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
