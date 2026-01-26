import { Array, Either } from 'effect'
import type { EventFilter } from '../../Events.ts'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface ReceivedReviewRequest {
  preprintId: Preprints.IndeterminatePreprintId
  id: Uuid.Uuid
}

export interface Input {
  reviewRequestId: Uuid.Uuid
}

export type Result = Either.Either<
  ReceivedReviewRequest,
  Errors.ReviewRequestHasBeenAccepted | Errors.ReviewRequestHasBeenRejected | Errors.UnknownReviewRequest
>

export const createFilter = ({ reviewRequestId }: Input): EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: [
    'ReviewRequestForAPreprintWasReceived',
    'ReviewRequestForAPreprintWasAccepted',
    'ReviewRequestForAPreprintWasRejected',
  ],
  predicates: { reviewRequestId },
})

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const received = yield* Either.fromOption(
      Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived')),
      () => new Errors.UnknownReviewRequest({}),
    )

    if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted'))) {
      return yield* Either.left(new Errors.ReviewRequestHasBeenAccepted({}))
    }

    if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasRejected'))) {
      return yield* Either.left(new Errors.ReviewRequestHasBeenRejected({}))
    }

    return {
      preprintId: received.preprintId,
      id: received.reviewRequestId,
    }
  })

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
