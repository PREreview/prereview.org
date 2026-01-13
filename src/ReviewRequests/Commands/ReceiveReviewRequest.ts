import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Function, Match, Option } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'

export interface Command {
  readonly receivedAt: Temporal.Instant
  readonly preprintId: Preprints.IndeterminatePreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requester: {
    readonly name: NonEmptyString.NonEmptyString
  }
}

export type State = NotReceived | HasBeenReceived

export class NotReceived extends Data.TaggedClass('NotReceived') {}

export class HasBeenReceived extends Data.TaggedClass('HasBeenReceived') {}

export const createFilter = (reviewRequestId: Uuid.Uuid): Events.EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: ['ReviewRequestForAPreprintWasReceived'],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  return Option.match(Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived')), {
    onNone: () => new NotReceived(),
    onSome: () => new HasBeenReceived(),
  })
}

export const decide: {
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent>
  (command: Command): (state: State) => Option.Option<Events.ReviewRequestEvent>
} = Function.dual(
  2,
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent> =>
    Match.valueTags(state, {
      HasBeenReceived: () => Option.none(),
      NotReceived: () =>
        Option.some(
          new Events.ReviewRequestForAPreprintWasReceived({
            receivedAt: command.receivedAt,
            preprintId: command.preprintId,
            reviewRequestId: command.reviewRequestId,
            requester: command.requester,
          }),
        ),
    }),
)

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
