import { Array, Effect, pipe } from 'effect'
import type { Uuid } from 'uuid-ts'
import { EventStore } from '../Context.js'
import type { FeedbackCommand } from './Commands.js'
import { DecideFeedback } from './Decide.js'
import { EvolveFeedback } from './Evolve.js'
import { FeedbackNotStarted, type FeedbackState } from './State.js'

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
