import type { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, pipe } from 'effect'
import type { EventFilter } from '../../Events.ts'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface PublishedReviewRequest {
  author: Option.Option<{ name: NonEmptyString.NonEmptyString }>
  preprintId: Preprints.IndeterminatePreprintId
  id: Uuid.Uuid
  published: Temporal.Instant
}

export interface Input {
  reviewRequestId: Uuid.Uuid
}

export type Result = Either.Either<PublishedReviewRequest, Errors.UnknownReviewRequest>

export const createFilter = ({ reviewRequestId }: Input): EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: [
    'ReviewRequestForAPreprintWasReceived',
    'ReviewRequestForAPreprintWasAccepted',
    'ReviewRequestForAPreprintWasImported',
  ],
  predicates: { reviewRequestId },
})

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const received = Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived'))

    const accepted = Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted'))

    return yield* Option.match(Option.all([received, accepted]), {
      onNone: () =>
        Either.fromOption(
          pipe(
            Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasImported')),
            Option.andThen(imported => ({
              author: imported.requester,
              preprintId: imported.preprintId,
              id: imported.reviewRequestId,
              published: imported.publishedAt,
            })),
          ),
          () => new Errors.UnknownReviewRequest({}),
        ),
      onSome: ([received, accepted]) =>
        Either.right({
          author: received.requester,
          preprintId: received.preprintId,
          id: received.reviewRequestId,
          published: accepted.acceptedAt,
        }),
    })
  })

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
