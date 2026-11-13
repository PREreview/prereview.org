import { Array, Boolean, Data, Result, Equal, Match, Option, Schema, type Types } from 'effect'
import * as Commands from '../../../Commands.ts'
import * as Events from '../../../Events.ts'
import type { NonEmptyString, OrcidId, Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'

export type Input = {
  readonly datasetReviewId: Uuid.Uuid
  readonly userId: OrcidId.OrcidId
} & (
  { readonly answer: 'yes'; readonly detail: Option.Option<NonEmptyString.NonEmptyString> } | { readonly answer: 'no' }
)

export type Error =
  Errors.DatasetReviewHasNotBeenStarted | Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewHasBeenPublished

type State = NotStarted | NotDeclared | HasBeenDeclared | IsBeingPublished | HasBeenPublished

class NotStarted extends Data.TaggedClass('NotStarted') {}

class NotDeclared extends Data.TaggedClass('NotDeclared')<{ authorId: OrcidId.OrcidId }> {}

class HasBeenDeclared extends Data.TaggedClass('HasBeenDeclared')<{
  generativeAiIdeas: Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview['generativeAiIdeas']
  authorId: OrcidId.OrcidId
}> {}

class IsBeingPublished extends Data.TaggedClass('IsBeingPublished')<{ authorId: OrcidId.OrcidId }> {}

class HasBeenPublished extends Data.TaggedClass('HasBeenPublished')<{ authorId: OrcidId.OrcidId }> {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: [
        'DatasetReviewWasStarted',
        'DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview',
        'PublicationOfDatasetReviewWasRequested',
        'DatasetReviewWasPublished',
      ],
      predicates: { datasetReviewId: input.datasetReviewId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  return Option.match(Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')), {
    onNone: () => new NotStarted(),
    onSome: ({ authorId }) => {
      if (Array.some(filteredEvents, hasTag('DatasetReviewWasPublished'))) {
        return new HasBeenPublished({ authorId })
      }

      if (Array.some(filteredEvents, hasTag('PublicationOfDatasetReviewWasRequested'))) {
        return new IsBeingPublished({ authorId })
      }

      return Option.match(
        Array.findLast(filteredEvents, hasTag('DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview')),
        {
          onNone: () => new NotDeclared({ authorId }),
          onSome: ({ generativeAiIdeas }) => new HasBeenDeclared({ generativeAiIdeas, authorId }),
        },
      )
    },
  })
}

const authorize = (state: State, input: Input): boolean =>
  state._tag === 'NotStarted' || Equal.equals(state.authorId, input.userId)

const decide = (state: State, input: Input): Result.Result<Option.Option<Events.Event>, Error> => {
  const generativeAiIdeas: Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview['generativeAiIdeas'] =
    input.answer === 'yes' ? { answer: input.answer, detail: input.detail } : { answer: input.answer }

  return Match.valueTags(state, {
    NotStarted: () => Result.fail(new Errors.DatasetReviewHasNotBeenStarted()),
    IsBeingPublished: () => Result.fail(new Errors.DatasetReviewIsBeingPublished()),
    HasBeenPublished: () => Result.fail(new Errors.DatasetReviewHasBeenPublished()),
    NotDeclared: () =>
      Result.succeed(
        Option.some(
          new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
            generativeAiIdeas,
            datasetReviewId: input.datasetReviewId,
          }),
        ),
      ),
    HasBeenDeclared: previous =>
      Boolean.match(isSameAnswer(generativeAiIdeas, previous.generativeAiIdeas), {
        onTrue: () => Result.succeed(Option.none()),
        onFalse: () =>
          Result.succeed(
            Option.some(
              new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
                generativeAiIdeas,
                datasetReviewId: input.datasetReviewId,
              }),
            ),
          ),
      }),
  })
}

const isSameAnswer = Schema.toEquivalence(
  Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview.fields.generativeAiIdeas,
)

export const DeclareIfAiWasUsedToGenerateNewIdeas = Commands.Command<[Input], State, Error, true>({
  name: 'DatasetReviews.declareIfAiWasUsedToGenerateNewIdeas',
  createFilter,
  foldState,
  authorize,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
