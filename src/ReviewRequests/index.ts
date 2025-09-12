import type { HttpClient } from '@effect/platform'
import type { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Effect, flow, Layer, pipe } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type * as Preprints from '../Preprints/index.js'
import * as PrereviewCoarNotify from '../prereview-coar-notify/index.js'
import {
  getReviewRequestsFromPrereviewCoarNotify,
  type PrereviewCoarNotifyConfig,
} from '../prereview-coar-notify/index.js'
import type {
  ReviewRequests as PageOfReviewRequests,
  RecentReviewRequestsAreUnavailable,
  RecentReviewRequestsNotFound,
} from '../review-requests-page/index.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'

export interface ReviewRequest {
  readonly published: Temporal.PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export class ReviewRequests extends Context.Tag('ReviewRequests')<
  ReviewRequests,
  {
    getFiveMostRecent: Effect.Effect<ReadonlyArray<ReviewRequest>>
    isReviewRequested: (id: PreprintId) => Effect.Effect<boolean>
    search: (query: {
      field?: FieldId
      language?: LanguageCode
      page: number
    }) => Effect.Effect<PageOfReviewRequests, RecentReviewRequestsNotFound | RecentReviewRequestsAreUnavailable>
  }
>() {}

export const { getFiveMostRecent } = Effect.serviceConstants(ReviewRequests)

export const { isReviewRequested, search } = Effect.serviceFunctions(ReviewRequests)

export const layer = Layer.effect(
  ReviewRequests,
  Effect.gen(function* () {
    const context = yield* Effect.context<HttpClient.HttpClient | Preprints.Preprints | PrereviewCoarNotifyConfig>()

    return {
      getFiveMostRecent: pipe(
        PrereviewCoarNotify.getFirstPageOfReviewRequestsFromPrereviewCoarNotify,
        Effect.orElseSucceed(Array.empty),
        Effect.provide(context),
      ),
      isReviewRequested: flow(
        PrereviewCoarNotify.isReviewRequested,
        Effect.orElseSucceed(() => false),
        Effect.provide(context),
      ),
      search: flow(getReviewRequestsFromPrereviewCoarNotify, Effect.provide(context)),
    }
  }),
)
