import { Array, Result, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { EmailAddress, Name, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface ReviewRequestToAcknowledge {
  readonly requester: { name: Name.Name; emailAddress: EmailAddress.EmailAddress }
  readonly preprintId: Preprints.IndeterminatePreprintId
}

export interface Input {
  reviewRequestId: Uuid.Uuid
}

export type Result = Result.Result<
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
  Result.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const received = yield* Result.fromOption(
      Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasReceived')),
      () => new Errors.UnknownReviewRequest({}),
    )

    if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasRejected'))) {
      return yield* Result.fail(new Errors.ReviewRequestHasBeenRejected({}))
    }

    if (!Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasAccepted'))) {
      return yield* Result.fail(new Errors.ReviewRequestHasNotBeenAccepted({}))
    }

    if (Array.some(filteredEvents, hasTag('EmailToAcknowledgeAReviewRequestForAPreprintWasSent'))) {
      return yield* Result.fail(new Errors.ReviewRequestWasAlreadyAcknowledged({}))
    }

    const requester = Option.flatMap(received.requester, requester =>
      Option.all({ name: Option.some(requester.name), emailAddress: Option.fromNullishOr(requester.emailAddress) }),
    )

    return yield* Option.match(requester, {
      onNone: () => Result.fail(new Errors.ReviewRequestCannotBeAcknowledged({})),
      onSome: requester => Result.succeed({ requester, preprintId: received.preprintId }),
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
