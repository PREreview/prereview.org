import type { HttpClient } from '@effect/platform'
import type { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Effect, flow, Layer, pipe, Scope } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as FeatureFlags from '../FeatureFlags.ts'
import type { Html } from '../html.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as Preprints from '../Preprints/index.ts'
import * as PrereviewCoarNotify from '../prereview-coar-notify/index.ts'
import {
  getReviewRequestsFromPrereviewCoarNotify,
  type PrereviewCoarNotifyConfig,
} from '../prereview-coar-notify/index.ts'
import type { FieldId } from '../types/field.ts'
import type { SubfieldId } from '../types/subfield.ts'
import { getTopicField, getTopicSubfield } from '../types/Topic.ts'
import {
  ReviewRequestsAreUnavailable,
  ReviewRequestsNotFound,
  type ReviewRequests as PageOfReviewRequests,
} from '../WebApp/review-requests-page/index.ts' // eslint-disable-line import/no-internal-modules
import * as Commands from './Commands/index.ts'
import * as Queries from './Queries/index.ts'

export * from './Commands/index.ts'
export * from './Errors.ts'
export * from './Events.ts'
export * from './Queries/index.ts'
export * from './Reactions/index.ts'

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
    }) => Effect.Effect<PageOfReviewRequests, ReviewRequestsNotFound | ReviewRequestsAreUnavailable>
  }
>() {}

export const { getFiveMostRecent } = Effect.serviceConstants(ReviewRequests)

export const { isReviewRequested, search } = Effect.serviceFunctions(ReviewRequests)

export const layer = Layer.provideMerge(
  Layer.effect(
    ReviewRequests,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(
        Effect.context<
          HttpClient.HttpClient | Preprints.Preprints | PrereviewCoarNotifyConfig | Queries.ReviewRequestQueries
        >(),
        Context.omit(Scope.Scope),
      )

      return yield* Effect.if(FeatureFlags.enableCoarNotifyInbox, {
        onTrue: () =>
          Effect.succeed({
            getFiveMostRecent: pipe(
              Queries.getFiveMostRecentReviewRequests(),
              Effect.andThen(
                Effect.forEach(
                  reviewRequest =>
                    Effect.gen(function* () {
                      return {
                        ...reviewRequest,
                        published: reviewRequest.published.toZonedDateTimeISO('UTC').toPlainDate(),
                        preprint: yield* Preprints.getPreprintTitle(reviewRequest.preprintId),
                        fields: Array.dedupe(Array.map(reviewRequest.topics, getTopicField)),
                        subfields: Array.dedupe(Array.map(reviewRequest.topics, getTopicSubfield)),
                      }
                    }),
                  { concurrency: 'inherit' },
                ),
              ),
              Effect.orElseSucceed(Array.empty),
              Effect.provide(context),
              Effect.withSpan('ReviewRequests.getFiveMostRecent'),
            ),
            isReviewRequested: flow(
              (preprintId: Preprints.IndeterminatePreprintId) =>
                Queries.doesAPreprintHaveAReviewRequest({ preprintId }),
              Effect.orElseSucceed(() => false),
              Effect.provide(context),
              Effect.withSpan('ReviewRequests.isReviewRequested'),
            ),
            search: flow(
              Queries.searchForPublishedReviewRequests,
              Effect.andThen(pageOfReviewRequests =>
                Effect.andThen(
                  Effect.forEach(
                    pageOfReviewRequests.reviewRequests,
                    reviewRequest =>
                      Effect.gen(function* () {
                        return {
                          ...reviewRequest,
                          published: reviewRequest.published.toZonedDateTimeISO('UTC').toPlainDate(),
                          preprint: yield* Preprints.getPreprintTitle(reviewRequest.preprintId),
                          fields: Array.dedupe(Array.map(reviewRequest.topics, getTopicField)),
                          subfields: Array.dedupe(Array.map(reviewRequest.topics, getTopicSubfield)),
                        }
                      }),
                    { concurrency: 'inherit' },
                  ),
                  reviewRequests => ({ ...pageOfReviewRequests, reviewRequests }),
                ),
              ),
              Effect.catchTags({
                NoReviewRequestsFound: error => new ReviewRequestsNotFound({ cause: error }),
                PreprintIsNotFound: error => new ReviewRequestsAreUnavailable({ cause: error }),
                PreprintIsUnavailable: error => new ReviewRequestsAreUnavailable({ cause: error }),
                UnableToQuery: error => new ReviewRequestsAreUnavailable({ cause: error }),
              }),
              Effect.provide(context),
              Effect.withSpan('ReviewRequests.search'),
            ),
          }),
        onFalse: () =>
          Effect.succeed({
            getFiveMostRecent: pipe(
              PrereviewCoarNotify.getFirstPageOfReviewRequestsFromPrereviewCoarNotify,
              Effect.orElseSucceed(Array.empty),
              Effect.provide(context),
              Effect.withSpan('ReviewRequests.getFiveMostRecent'),
            ),
            isReviewRequested: flow(
              PrereviewCoarNotify.isReviewRequested,
              Effect.orElseSucceed(() => false),
              Effect.provide(context),
              Effect.withSpan('ReviewRequests.isReviewRequested'),
            ),
            search: flow(
              getReviewRequestsFromPrereviewCoarNotify,
              Effect.provide(context),
              Effect.withSpan('ReviewRequests.search'),
            ),
          }),
      })
    }),
  ),
  Layer.mergeAll(Commands.commandsLayer, Queries.queriesLayer),
)
