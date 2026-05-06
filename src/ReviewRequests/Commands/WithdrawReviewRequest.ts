import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  readonly withdrawnAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
  readonly reason: 'preprint-withdrawn-from-preprint-server' | 'mistakenly-requested'
}

export type Error = Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenRejected

type State =
  | UnknownReviewRequest
  | HasNotBeenAccepted
  | HasBeenRejected
  | HasNotBeenPublished
  | HasBeenPublished
  | HasBeenWithdrawn

class UnknownReviewRequest extends Data.TaggedClass('UnknownReviewRequest') {}

class HasNotBeenAccepted extends Data.TaggedClass('HasNotBeenAccepted') {}

class HasBeenRejected extends Data.TaggedClass('HasBeenRejected') {}

class HasNotBeenPublished extends Data.TaggedClass('HasNotBeenPublished') {}

class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

class HasBeenWithdrawn extends Data.TaggedClass('HasBeenWithdrawn') {}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasPublished',
      'ReviewRequestForAPreprintWasReceived',
      'ReviewRequestForAPreprintWasAccepted',
      'ReviewRequestForAPreprintWasRejected',
      'ReviewRequestByAPrereviewerWasImported',
      'ReviewRequestFromAPreprintServerWasImported',
      'ReviewRequestForAPreprintWasWithdrawn',
    ],
    predicates: { reviewRequestId: input.reviewRequestId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (
    !Array.some(
      filteredEvents,
      hasTag(
        'ReviewRequestForAPreprintWasPublished',
        'ReviewRequestForAPreprintWasReceived',
        'ReviewRequestByAPrereviewerWasImported',
        'ReviewRequestFromAPreprintServerWasImported',
      ),
    )
  ) {
    return new UnknownReviewRequest()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasWithdrawn'))) {
    return new HasBeenWithdrawn()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasRejected'))) {
    return new HasBeenRejected()
  }

  if (
    Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived')) &&
    !Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted'))
  ) {
    return new HasNotBeenAccepted()
  }

  if (
    !Array.some(
      filteredEvents,
      hasTag(
        'ReviewRequestForAPreprintWasPublished',
        'ReviewRequestForAPreprintWasAccepted',
        'ReviewRequestByAPrereviewerWasImported',
        'ReviewRequestFromAPreprintServerWasImported',
      ),
    )
  ) {
    return new HasNotBeenPublished()
  }

  return new HasBeenPublished()
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
  Match.valueTags(state, {
    UnknownReviewRequest: () => Either.left(new Errors.UnknownReviewRequest({})),
    HasNotBeenPublished: () => Either.left(new Errors.UnknownReviewRequest({})),
    HasNotBeenAccepted: () =>
      Either.right(
        Option.some(
          new Events.ReviewRequestForAPreprintWasWithdrawn({
            withdrawnAt: input.withdrawnAt,
            reviewRequestId: input.reviewRequestId,
            reason: input.reason,
          }),
        ),
      ),
    HasBeenRejected: () => Either.left(new Errors.ReviewRequestHasBeenRejected({})),
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

export const WithdrawReviewRequest = Commands.Command({
  name: 'ReviewRequestCommands.withdrawReviewRequest',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
