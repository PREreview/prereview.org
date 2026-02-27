import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Events from '../../Events.js'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly withdrawnAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
  readonly reason: 'preprint-withdrawn-from-preprint-server'
}

export type Error = Errors.UnknownReviewRequest

export type State = NotAccepted | HasBeenPublished | HasBeenWithdrawn

export class NotAccepted extends Data.TaggedClass('NotAccepted') {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

export class HasBeenWithdrawn extends Data.TaggedClass('HasBeenWithdrawn') {}

export const createFilter = (command: Command) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasAccepted',
      'ReviewRequestByAPrereviewerWasImported',
      'ReviewRequestFromAPreprintServerWasImported',
      'ReviewRequestForAPreprintWasWithdrawn',
    ],
    predicates: { reviewRequestId: command.reviewRequestId },
  })

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, command: Command): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(command)))

  if (
    !Array.some(
      filteredEvents,
      hasTag(
        'ReviewRequestForAPreprintWasAccepted',
        'ReviewRequestByAPrereviewerWasImported',
        'ReviewRequestFromAPreprintServerWasImported',
      ),
    )
  ) {
    return new NotAccepted()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasWithdrawn'))) {
    return new HasBeenWithdrawn()
  }

  return new HasBeenPublished()
}

export const decide = (
  state: State,
  command: Command,
): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
  Match.valueTags(state, {
    NotAccepted: () => Either.left(new Errors.UnknownReviewRequest({})),
    HasBeenPublished: () =>
      Either.right(
        Option.some(
          new Events.ReviewRequestForAPreprintWasWithdrawn({
            withdrawnAt: command.withdrawnAt,
            reviewRequestId: command.reviewRequestId,
            reason: command.reason,
          }),
        ),
      ),
    HasBeenWithdrawn: () => Either.right(Option.none()),
  })

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
