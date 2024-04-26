import { Temporal } from '@js-temporal/polyfill'
import * as RT from 'fp-ts/ReaderTask'
import type * as T from 'fp-ts/Task'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html'
import type { ReviewRequestPreprintId } from '../review-request'

import PlainDate = Temporal.PlainDate

export interface RecentReviewRequest {
  readonly published: PlainDate
  readonly preprint: {
    readonly id: ReviewRequestPreprintId
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
