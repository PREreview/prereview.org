import { Array, Data, Result, flow, Match, Option, type Types } from 'effect'
import * as Commands from '../../../Commands.ts'
import * as Events from '../../../Events.ts'
import type { Temporal, Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  readonly publishedAt: Temporal.Instant
  readonly reviewRequestId: Uuid.Uuid
}

export type Error =
  Errors.UnknownReviewRequest | Errors.ReviewRequestNotReadyToBePublished | Errors.ReviewRequestHasBeenPublished

type State = NotStarted | NotReady | IsReady | HasBeenPublished

class NotStarted extends Data.TaggedClass('NotStarted') {}

class NotReady extends Data.TaggedClass('NotReady')<{
  missing: ['PersonaForAReviewRequestForAPreprintWasChosen']
}> {}

class IsReady extends Data.TaggedClass('IsReady') {}

class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasStarted',
      'PersonaForAReviewRequestForAPreprintWasChosen',
      'ReviewRequestForAPreprintWasPublished',
    ],
    predicates: { reviewRequestId: input.reviewRequestId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (!Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasStarted'))) {
    return new NotStarted()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasPublished'))) {
    return new HasBeenPublished()
  }

  if (!Array.some(filteredEvents, hasTag('PersonaForAReviewRequestForAPreprintWasChosen'))) {
    return new NotReady({ missing: ['PersonaForAReviewRequestForAPreprintWasChosen'] })
  }

  return new IsReady()
}

const decide = (state: State, input: Input): Result.Result<Events.ReviewRequestEvent, Error> =>
  Match.valueTags(state, {
    NotStarted: () => Result.fail(new Errors.UnknownReviewRequest({})),
    NotReady: ({ missing }) => Result.fail(new Errors.ReviewRequestNotReadyToBePublished({ missing })),
    IsReady: () =>
      Result.succeed(
        new Events.ReviewRequestForAPreprintWasPublished({
          publishedAt: input.publishedAt,
          reviewRequestId: input.reviewRequestId,
        }),
      ),
    HasBeenPublished: () => Result.fail(new Errors.ReviewRequestHasBeenPublished({})),
  })

export const PublishReviewRequest = Commands.Command({
  name: 'ReviewRequestCommands.publishReviewRequest',
  createFilter,
  foldState,
  decide: flow(decide, Result.map(Option.some)),
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
