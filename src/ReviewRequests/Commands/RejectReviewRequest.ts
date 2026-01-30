import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Function, Match, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly rejectedAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
  readonly reason: 'not-a-preprint' | 'unknown-preprint'
}

export type Error = Errors.ReviewRequestHasBeenAccepted | Errors.UnknownReviewRequest

export type State = NotReceived | NotRejected | HasBeenRejected | HasBeenAccepted

export class NotReceived extends Data.TaggedClass('NotReceived') {}

export class NotRejected extends Data.TaggedClass('NotRejected') {}

export class HasBeenRejected extends Data.TaggedClass('HasBeenRejected') {}

export class HasBeenAccepted extends Data.TaggedClass('HasBeenAccepted') {}

export const createFilter = (
  reviewRequestId: Uuid.Uuid,
): Events.EventFilter<Types.Tags<Events.ReviewRequestEvent>> => ({
  types: [
    'ReviewRequestForAPreprintWasReceived',
    'ReviewRequestForAPreprintWasRejected',
    'ReviewRequestForAPreprintWasAccepted',
  ],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  if (!Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived'))) {
    return new NotReceived()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasRejected'))) {
    return new HasBeenRejected()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted'))) {
    return new HasBeenAccepted()
  }

  return new NotRejected()
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
    Match.valueTags(state, {
      NotReceived: () => Either.left(new Errors.UnknownReviewRequest({})),
      HasBeenAccepted: () => Either.left(new Errors.ReviewRequestHasBeenAccepted({})),
      HasBeenRejected: () => Either.right(Option.none()),
      NotRejected: () =>
        Either.right(
          Option.some(
            new Events.ReviewRequestForAPreprintWasRejected({
              rejectedAt: command.rejectedAt,
              reviewRequestId: command.reviewRequestId,
              reason: command.reason,
            }),
          ),
        ),
    }),
)

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
