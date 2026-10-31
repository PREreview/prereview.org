import { Array, Boolean, Data, Result, Equal, Function, Match, Option, type Types } from 'effect'
import type { Doi, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Events from '../Events.ts'

export interface Command {
  readonly doi: Doi.Doi
  readonly datasetReviewId: Uuid.Uuid
}

export type Error = Errors.DatasetReviewHasNotBeenStarted | Errors.DatasetReviewAlreadyHasADoi

export type State = NotStarted | AlreadyHasADoi | DoesNotHaveADoi

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class AlreadyHasADoi extends Data.TaggedClass('AlreadyHasADoi')<{ doi: Doi.Doi }> {}

export class DoesNotHaveADoi extends Data.TaggedClass('DoesNotHaveADoi') {}

export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  if (!Array.some(events, hasTag('DatasetReviewWasStarted'))) {
    return new NotStarted()
  }

  return Option.match(Array.findLast(events, hasTag('DatasetReviewWasAssignedADoi')), {
    onNone: () => new DoesNotHaveADoi(),
    onSome: ({ doi }) => new AlreadyHasADoi({ doi }),
  })
}

export const decide: {
  (state: State, command: Command): Result.Result<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Result.Result<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(2, (state: State, command: Command): Result.Result<Option.Option<Events.DatasetReviewEvent>, Error> =>
  Match.valueTags(state, {
    NotStarted: () => Result.fail(new Errors.DatasetReviewHasNotBeenStarted()),
    AlreadyHasADoi: ({ doi }) =>
      Boolean.match(Equal.equals(command.doi, doi), {
        onFalse: () => Result.fail(new Errors.DatasetReviewAlreadyHasADoi({})),
        onTrue: () => Result.succeed(Option.none()),
      }),
    DoesNotHaveADoi: () =>
      Result.succeed(
        Option.some(
          new Events.DatasetReviewWasAssignedADoi({
            doi: command.doi,
            datasetReviewId: command.datasetReviewId,
          }),
        ),
      ),
  }),
)

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
