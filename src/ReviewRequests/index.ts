import type { Temporal } from '@js-temporal/polyfill'
import { Array, Context, Effect, flow, Layer, pipe, Scope } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as Preprints from '../Preprints/index.ts'
import type { FieldId } from '../types/field.ts'
import type { OrcidId } from '../types/index.ts'
import type { SubfieldId } from '../types/subfield.ts'
import { getTopicField, getTopicSubfield } from '../types/Topic.ts'
import {
  ReviewRequestsAreUnavailable,
  ReviewRequestsNotFound,
  type ReviewRequests as PageOfReviewRequests,
} from '../WebApp/review-requests-page/index.ts' // eslint-disable-line import/no-internal-modules
import * as Commands from './Commands/index.ts'
import * as Queries from './Queries/index.ts'
import * as Workflows from './Workflows/index.ts'

export * from './Commands/index.ts'
export * from './Errors.ts'
export * from './Events.ts'
export * from './Queries/index.ts'
export * from './Reactions.ts'
export * from './Workflows/index.ts'

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

export interface ReviewRequestForPrereviewer {
  readonly published: Temporal.PlainDate
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
    listForPrereviewer: (
      requesterId: OrcidId.OrcidId,
    ) => Effect.Effect<ReadonlyArray<ReviewRequestForPrereviewer>, ReviewRequestsAreUnavailable>
    search: (query: {
      field?: FieldId
      language?: LanguageCode
      page: number
    }) => Effect.Effect<PageOfReviewRequests, ReviewRequestsNotFound | ReviewRequestsAreUnavailable>
  }
>() {}

export const { getFiveMostRecent } = Effect.serviceConstants(ReviewRequests)

export const { search, listForPrereviewer } = Effect.serviceFunctions(ReviewRequests)

export const layer = pipe(
  Layer.effect(
    ReviewRequests,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(
        Effect.context<Preprints.Preprints | Queries.ReviewRequestQueries>(),
        Context.omit(Scope.Scope),
      )

      return {
        getFiveMostRecent: pipe(
          Queries.getFiveMostRecentReviewRequests(),
          Effect.andThen(
            flow(
              Array.map(reviewRequest =>
                Effect.gen(function* () {
                  return {
                    ...reviewRequest,
                    published: reviewRequest.published.toZonedDateTimeISO('UTC').toPlainDate(),
                    preprint: yield* Preprints.getPreprintTitle(reviewRequest.preprintId),
                    fields: Array.dedupe(Array.map(reviewRequest.topics, getTopicField)),
                    subfields: Array.dedupe(Array.map(reviewRequest.topics, getTopicSubfield)),
                  }
                }),
              ),
              effects => Effect.allSuccesses(effects, { concurrency: 'inherit' }),
            ),
          ),
          Effect.orElseSucceed(Array.empty),
          Effect.provide(context),
          Effect.withSpan('ReviewRequests.getFiveMostRecent'),
        ),
        listForPrereviewer: flow(
          requesterId => Queries.listAllPublishedReviewRequestsByAPrereviewer({ requesterId }),
          Effect.andThen(
            Effect.forEach(
              Effect.fnUntraced(function* (reviewRequest) {
                return {
                  ...reviewRequest,
                  published: reviewRequest.published.toZonedDateTimeISO('UTC').toPlainDate(),
                  preprint: yield* Preprints.getPreprintTitle(reviewRequest.preprintId),
                  subfields: reviewRequest.subfields,
                }
              }),
              { concurrency: 'inherit' },
            ),
          ),
          Effect.catchTags({
            PreprintIsNotFound: error => new ReviewRequestsAreUnavailable({ cause: error }),
            PreprintIsUnavailable: error => new ReviewRequestsAreUnavailable({ cause: error }),
            UnableToQuery: error => new ReviewRequestsAreUnavailable({ cause: error }),
          }),
          Effect.provide(context),
          Effect.withSpan('ReviewRequests.listForPrereviewer'),
        ),
        search: flow(
          Queries.searchForPublishedReviewRequests,
          Effect.andThen(pageOfReviewRequests =>
            pipe(
              pageOfReviewRequests.reviewRequests,
              Array.map(reviewRequest =>
                Effect.gen(function* () {
                  return {
                    ...reviewRequest,
                    published: reviewRequest.published.toZonedDateTimeISO('UTC').toPlainDate(),
                    preprint: yield* Preprints.getPreprintTitle(reviewRequest.preprintId),
                    fields: Array.dedupe(Array.map(reviewRequest.topics, getTopicField)),
                    subfields: Array.dedupe(Array.map(reviewRequest.topics, getTopicSubfield)),
                  }
                }),
              ),
              effects => Effect.allSuccesses(effects, { concurrency: 'inherit' }),
              Effect.andThen(
                Array.match({
                  onNonEmpty: reviewRequests => Effect.succeed({ ...pageOfReviewRequests, reviewRequests }),
                  onEmpty: () => new ReviewRequestsAreUnavailable({ cause: 'no results remain after hiding failures' }),
                }),
              ),
            ),
          ),
          Effect.catchTags({
            NoReviewRequestsFound: error => new ReviewRequestsNotFound({ cause: error }),
            UnableToQuery: error => new ReviewRequestsAreUnavailable({ cause: error }),
          }),
          Effect.provide(context),
          Effect.withSpan('ReviewRequests.search'),
        ),
      }
    }),
  ),
  Layer.provideMerge(Workflows.workflowsLayer),
  Layer.provideMerge(Layer.mergeAll(Commands.commandsLayer, Queries.queriesLayer)),
)
