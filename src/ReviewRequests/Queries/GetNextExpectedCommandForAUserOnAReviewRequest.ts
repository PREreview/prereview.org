import { Array, Either, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export type NextExpectedCommand = 'ChoosePersona' | 'PublishReviewRequest'

const createFilter = ({ reviewRequestId }: Input) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasStarted',
      'PersonaForAReviewRequestForAPreprintWasChosen',
      'ReviewRequestForAPreprintWasPublished',
      'ReviewRequestByAPrereviewerWasImported',
    ],
    predicates: { reviewRequestId },
  })

export interface Input {
  reviewRequestId: Uuid.Uuid
}

export type Result = Either.Either<
  NextExpectedCommand,
  Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished
>

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    if (hasEvent(filteredEvents, 'ReviewRequestByAPrereviewerWasImported')) {
      return yield* Either.left(
        new Errors.ReviewRequestHasBeenPublished({ cause: 'ReviewRequestByAPrereviewerWasImported event found' }),
      )
    }

    if (!hasEvent(filteredEvents, 'ReviewRequestForAPreprintWasStarted')) {
      return yield* Either.left(
        new Errors.UnknownReviewRequest({ cause: 'no ReviewRequestForAPreprintWasStarted event found' }),
      )
    }

    if (hasEvent(filteredEvents, 'ReviewRequestForAPreprintWasPublished')) {
      return yield* Either.left(
        new Errors.ReviewRequestHasBeenPublished({ cause: 'ReviewRequestForAPreprintWasPublished event found' }),
      )
    }

    if (!hasEvent(filteredEvents, 'PersonaForAReviewRequestForAPreprintWasChosen')) {
      return 'ChoosePersona'
    }

    return 'PublishReviewRequest'
  })

export const GetNextExpectedCommandForAUserOnAReviewRequest = Queries.OnDemandQuery({
  name: 'ReviewRequestQueries.getNextExpectedCommandForAUserOnAReviewRequest',
  createFilter,
  query,
})

function hasEvent<T extends Events.Event>(events: ReadonlyArray<T>, ...tags: ReadonlyArray<Types.Tags<T>>): boolean {
  return Array.some(events, hasTag(...tags))
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
