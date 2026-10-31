import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Result, Function, Match, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly rejectedAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
  readonly reason: 'not-a-preprint' | 'unknown-preprint'
}

export type Error =
  Errors.ReviewRequestHasBeenAccepted | Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenWithdrawn

export type State = NotReceived | NotRejected | HasBeenRejected | HasBeenAccepted | HasBeenWithdrawn

export class NotReceived extends Data.TaggedClass('NotReceived') {}

export class NotRejected extends Data.TaggedClass('NotRejected') {}

export class HasBeenRejected extends Data.TaggedClass('HasBeenRejected') {}

export class HasBeenAccepted extends Data.TaggedClass('HasBeenAccepted') {}

export class HasBeenWithdrawn extends Data.TaggedClass('HasBeenWithdrawn') {}

export const createFilter = (reviewRequestId: Uuid.Uuid) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasReceived',
      'ReviewRequestForAPreprintWasRejected',
      'ReviewRequestForAPreprintWasAccepted',
      'ReviewRequestForAPreprintWasWithdrawn',
    ],
    predicates: { reviewRequestId },
  })

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  if (!Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived'))) {
    return new NotReceived()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasWithdrawn'))) {
    return new HasBeenWithdrawn()
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
  (state: State, command: Command): Result.Result<Option.Option<Events.ReviewRequestEvent>, Error>
  (command: Command): (state: State) => Result.Result<Option.Option<Events.ReviewRequestEvent>, Error>
} = Function.dual(2, (state: State, command: Command): Result.Result<Option.Option<Events.ReviewRequestEvent>, Error> =>
  Match.valueTags(state, {
    NotReceived: () => Result.fail(new Errors.UnknownReviewRequest({})),
    HasBeenAccepted: () => Result.fail(new Errors.ReviewRequestHasBeenAccepted({})),
    HasBeenWithdrawn: () => Result.fail(new Errors.ReviewRequestHasBeenWithdrawn({})),
    HasBeenRejected: () => Result.succeed(Option.none()),
    NotRejected: () =>
      Result.succeed(
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
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
