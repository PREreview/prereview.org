import { Array, Result, Equal, Option, Struct, type Types } from 'effect'
import * as Events from '../../../Events.ts'
import { EventFilter } from '../../../Events.ts'
import type { OrcidId, Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
  userId: OrcidId.OrcidId
}

export type Result = Result.Result<
  Option.Option<Events.PersonaForDatasetReviewWasChosen['persona']>,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
>

export const createFilter = ({ datasetReviewId }: Input) =>
  EventFilter({
    types: [
      'DatasetReviewWasStarted',
      'PersonaForDatasetReviewWasChosen',
      'PublicationOfDatasetReviewWasRequested',
      'DatasetReviewWasPublished',
    ],
    predicates: { datasetReviewId },
  })

export const query = (events: ReadonlyArray<Events.DatasetReviewEvent>, input: Input): Result =>
  Result.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const started = yield* Result.fromOption(
      Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')),
      () => new Errors.DatasetReviewHasNotBeenStarted(),
    )

    if (!Equal.equals(started.authorId, input.userId)) {
      return yield* Result.fail(new Errors.DatasetReviewWasStartedByAnotherUser())
    }

    if (Array.some(filteredEvents, hasTag('DatasetReviewWasPublished'))) {
      return yield* Result.fail(new Errors.DatasetReviewHasBeenPublished())
    }

    if (Array.some(filteredEvents, hasTag('PublicationOfDatasetReviewWasRequested'))) {
      return yield* Result.fail(new Errors.DatasetReviewIsBeingPublished())
    }

    return Option.map(Array.findLast(filteredEvents, hasTag('PersonaForDatasetReviewWasChosen')), Struct.get('persona'))
  })

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
