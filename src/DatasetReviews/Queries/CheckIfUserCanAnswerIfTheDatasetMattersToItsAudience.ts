import { Array, Either, Equal, Option, Struct } from 'effect'
import type { EventFilter } from '../../Events.ts'
import * as Events from '../../Events.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
  userId: OrcidId.OrcidId
}

export type Result = Either.Either<
  Option.Option<Events.AnsweredIfTheDatasetMattersToItsAudience['answer']>,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
>

export const createFilter = ({ datasetReviewId }: Input): EventFilter<Events.DatasetReviewEvent['_tag']> => ({
  types: [
    'DatasetReviewWasStarted',
    'AnsweredIfTheDatasetMattersToItsAudience',
    'PublicationOfDatasetReviewWasRequested',
    'DatasetReviewWasPublished',
  ],
  predicates: { datasetReviewId },
})

export const query = (events: ReadonlyArray<Events.DatasetReviewEvent>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const started = yield* Either.fromOption(
      Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')),
      () => new Errors.DatasetReviewHasNotBeenStarted(),
    )

    if (!Equal.equals(started.authorId, input.userId)) {
      return yield* Either.left(new Errors.DatasetReviewWasStartedByAnotherUser())
    }

    if (Array.some(filteredEvents, hasTag('DatasetReviewWasPublished'))) {
      return yield* Either.left(new Errors.DatasetReviewHasBeenPublished())
    }

    if (Array.some(filteredEvents, hasTag('PublicationOfDatasetReviewWasRequested'))) {
      return yield* Either.left(new Errors.DatasetReviewIsBeingPublished())
    }

    return Option.map(
      Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetMattersToItsAudience')),
      Struct.get('answer'),
    )
  })

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
