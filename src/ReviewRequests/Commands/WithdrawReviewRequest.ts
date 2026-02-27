import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Events from '../../Events.js'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  readonly withdrawnAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
  readonly reason: 'preprint-withdrawn-from-preprint-server'
}

export type Error = Errors.UnknownReviewRequest

type State = NotAccepted | HasBeenPublished | HasBeenWithdrawn

class NotAccepted extends Data.TaggedClass('NotAccepted') {}

class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

class HasBeenWithdrawn extends Data.TaggedClass('HasBeenWithdrawn') {}

export const createFilter = (input: Input) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasAccepted',
      'ReviewRequestByAPrereviewerWasImported',
      'ReviewRequestFromAPreprintServerWasImported',
      'ReviewRequestForAPreprintWasWithdrawn',
    ],
    predicates: { reviewRequestId: input.reviewRequestId },
  })

export const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

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

export const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    NotAccepted: () => Either.left(new Errors.UnknownReviewRequest({})),
    HasBeenPublished: () =>
      Either.right(
        Option.some(
          new Events.ReviewRequestForAPreprintWasWithdrawn({
            withdrawnAt: input.withdrawnAt,
            reviewRequestId: input.reviewRequestId,
            reason: input.reason,
          }),
        ),
      ),
    HasBeenWithdrawn: () => Either.right(Option.none()),
  })

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
