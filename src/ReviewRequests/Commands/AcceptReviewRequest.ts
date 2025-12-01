import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Function, Match, Option } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'

export interface Command {
  readonly receivedAt: Temporal.Instant
  readonly acceptedAt: Temporal.Instant
  readonly preprintId: Preprints.PreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requester: {
    readonly name: NonEmptyString.NonEmptyString
  }
}

export type State = NotAccepted | HasBeenAccepted

export class NotAccepted extends Data.TaggedClass('NotAccepted') {}

export class HasBeenAccepted extends Data.TaggedClass('HasBeenAccepted') {}

export const createFilter = (reviewRequestId: Uuid.Uuid): Events.EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: ['ReviewRequestForAPreprintWasAccepted'],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  return Option.match(Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted')), {
    onNone: () => new NotAccepted(),
    onSome: () => new HasBeenAccepted(),
  })
}

export const decide: {
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent>
  (command: Command): (state: State) => Option.Option<Events.ReviewRequestEvent>
} = Function.dual(
  2,
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent> =>
    Match.valueTags(state, {
      HasBeenAccepted: () => Option.none(),
      NotAccepted: () =>
        Option.some(
          new Events.ReviewRequestForAPreprintWasAccepted({
            receivedAt: command.receivedAt,
            acceptedAt: command.acceptedAt,
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
