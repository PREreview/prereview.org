import type { Temporal } from '@js-temporal/polyfill'
import { Array, Either } from 'effect'
import type { EventFilter } from '../../Events.ts'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface PublishedReviewRequest {
  author: { name: NonEmptyString.NonEmptyString }
  preprintId: Preprints.IndeterminatePreprintId
  id: Uuid.Uuid
  published: Temporal.Instant
}

export interface Input {
  reviewRequestId: Uuid.Uuid
}

export type Result = Either.Either<PublishedReviewRequest, Errors.UnknownReviewRequest>

export const createFilter = ({ reviewRequestId }: Input): EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: ['ReviewRequestForAPreprintWasAccepted'],
  predicates: { reviewRequestId },
})

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const received = yield* Either.fromOption(
      Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted')),
      () => new Errors.UnknownReviewRequest({}),
    )

    return {
      author: received.requester,
      preprintId: received.preprintId,
      id: received.reviewRequestId,
      published: received.acceptedAt,
    }
  })

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
