import { Temporal } from '@js-temporal/polyfill'
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
