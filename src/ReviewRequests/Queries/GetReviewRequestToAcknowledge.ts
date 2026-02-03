import { Array, Either, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { EmailAddress, NonEmptyString, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface ReviewRequestToAcknowledge {
  readonly requester: { name: NonEmptyString.NonEmptyString; emailAddress: EmailAddress.EmailAddress }
}

export interface Input {
  reviewRequestId: Uuid.Uuid
}

export type Result = Either.Either<
  ReviewRequestToAcknowledge,
  | Errors.ReviewRequestCannotBeAcknowledged
  | Errors.ReviewRequestWasAlreadyAcknowledged
  | Errors.ReviewRequestHasBeenRejected
  | Errors.ReviewRequestHasNotBeenAccepted
  | Errors.UnknownReviewRequest
>

const createFilter = ({ reviewRequestId }: Input) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasReceived',
      'ReviewRequestForAPreprintWasAccepted',
      'ReviewRequestForAPreprintWasRejected',
      'EmailToAcknowledgeAReviewRequestForAPreprintWasSent',
    ],
    predicates: { reviewRequestId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const received = yield* Either.fromOption(
      Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived')),
      () => new Errors.UnknownReviewRequest({}),
    )

    if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasRejected'))) {
      return yield* Either.left(new Errors.ReviewRequestHasBeenRejected({}))
    }

    if (!Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted'))) {
      return yield* Either.left(new Errors.ReviewRequestHasNotBeenAccepted({}))
    }

    if (Array.some(filteredEvents, hasTag('EmailToAcknowledgeAReviewRequestForAPreprintWasSent'))) {
      return yield* Either.left(new Errors.ReviewRequestWasAlreadyAcknowledged({}))
    }

    const requester = Option.filterMap(received.requester, requester =>
      Option.all({ name: Option.some(requester.name), emailAddress: Option.fromNullable(requester.emailAddress) }),
    )

    return yield* Option.match(requester, {
      onNone: () => Either.left(new Errors.ReviewRequestCannotBeAcknowledged({})),
      onSome: requester => Either.right({ requester }),
    })
  })

export const GetReviewRequestToAcknowledge = Queries.OnDemandQuery({
  name: 'ReviewRequestQueries.getReviewRequestToAcknowledge',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
