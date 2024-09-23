import { Array, Context, Data, Effect, pipe, type Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { EventStore } from '../Context.js'
import type { FeedbackCommand } from './Commands.js'
import { DecideFeedback } from './Decide.js'
import { EvolveFeedback } from './Evolve.js'
import * as Queries from './Queries.js'
import {
  type FeedbackInProgress,
  FeedbackNotStarted,
  type FeedbackReadyForPublishing,
  type FeedbackState,
} from './State.js'

export * from './Commands.js'
export * from './Decide.js'
export * from './Errors.js'
export * from './Events.js'
export * from './Evolve.js'
export * from './State.js'

export const handleFeedbackCommand = (id: Uuid, command: FeedbackCommand) =>
  Effect.gen(function* () {
    const eventStore = yield* EventStore

    const { events, latestVersion } = yield* eventStore.getEvents(id)

    const state = Array.reduce(events, new FeedbackNotStarted() as FeedbackState, (state, event) =>
      EvolveFeedback(state)(event),
    )

    yield* pipe(DecideFeedback(state)(command), Effect.andThen(eventStore.commitEvent(id, latestVersion)))
  })

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: Error }> {}

export class GetAllUnpublishedFeedbackByAnAuthorForAPrereview extends Context.Tag(
  'GetAllUnpublishedFeedbackByAnAuthorForAPrereview',
)<
  GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
  (params: {
    readonly authorId: Orcid
    readonly prereviewId: number
  }) => Effect.Effect<Record.ReadonlyRecord<Uuid, FeedbackInProgress | FeedbackReadyForPublishing>, UnableToQuery>
>() {}

export const makeGetAllUnpublishedFeedbackByAnAuthorForAPrereview: Effect.Effect<
  typeof GetAllUnpublishedFeedbackByAnAuthorForAPrereview.Service,
  never,
  EventStore
> = Effect.gen(function* () {
  const eventStore = yield* EventStore

  return ({ authorId, prereviewId }) =>
    Effect.gen(function* () {
      const events = yield* eventStore.getAllEvents

      return Queries.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({ authorId, prereviewId })
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})
