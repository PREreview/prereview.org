import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Function, Match, Option } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly receivedAt: Temporal.Instant
  readonly acceptedAt: Temporal.Instant
  readonly preprintId: Preprints.PreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requester: {
    readonly name: NonEmptyString.NonEmptyString
  }
}

export type Error = Errors.UnknownReviewRequest

export type State = NotReceived | NotAccepted | HasBeenAccepted

export class NotReceived extends Data.TaggedClass('NotReceived') {}

export class NotAccepted extends Data.TaggedClass('NotAccepted') {}

export class HasBeenAccepted extends Data.TaggedClass('HasBeenAccepted') {}

export const createFilter = (reviewRequestId: Uuid.Uuid): Events.EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: ['ReviewRequestForAPreprintWasReceived', 'ReviewRequestForAPreprintWasAccepted'],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  if (!Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived'))) {
    return new NotReceived()
  }

  return Option.match(Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted')), {
    onNone: () => new NotAccepted(),
    onSome: () => new HasBeenAccepted(),
  })
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
    Match.valueTags(state, {
      NotReceived: () => Either.left(new Errors.UnknownReviewRequest({})),
      HasBeenAccepted: () => Either.right(Option.none()),
      NotAccepted: () =>
        Either.right(
          Option.some(
            new Events.ReviewRequestForAPreprintWasAccepted({
              receivedAt: command.receivedAt,
              acceptedAt: command.acceptedAt,
              preprintId: command.preprintId,
              reviewRequestId: command.reviewRequestId,
              requester: command.requester,
            }),
          ),
        ),
    }),
)

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
