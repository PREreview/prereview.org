import { Context, Data, Effect, type Either, Layer } from 'effect'
import type * as EventStore from '../../EventStore.ts'
import type * as GetPublishedReviewRequest from './GetPublishedReviewRequest.ts'

export class ReviewRequestQueries extends Context.Tag('ReviewRequestQueries')<
  ReviewRequestQueries,
  {
    getPublishedReviewRequest: Query<(input: GetPublishedReviewRequest.Input) => GetPublishedReviewRequest.Result>
  }
>() {}

type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Either.Either<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | E | L>
  : Effect.Effect<ReturnType<F>, UnableToQuery | E>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export const { getPublishedReviewRequest } = Effect.serviceFunctions(ReviewRequestQueries)

export type { PublishedReviewRequest } from './GetPublishedReviewRequest.ts'

const makeReviewRequestQueries: Effect.Effect<typeof ReviewRequestQueries.Service, never, EventStore.EventStore> =
  Effect.sync(() => {
    return {
      getPublishedReviewRequest: () => new UnableToQuery({ cause: 'not implemented' }),
    }
  })

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
