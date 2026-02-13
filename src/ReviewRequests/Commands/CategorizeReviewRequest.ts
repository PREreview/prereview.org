import { Array, Boolean, Data, Either, Equal, Function, Match, Option } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'
import type { KeywordId } from '../../types/Keyword.ts'
import type { TopicId } from '../../types/Topic.ts'
import type * as Errors from '../Errors.ts'

export interface Command {
  readonly language: LanguageCode
  readonly keywords: ReadonlyArray<KeywordId>
  readonly topics: ReadonlyArray<TopicId>
  readonly reviewRequestId: Uuid.Uuid
}

export type Error = Errors.ReviewRequestWasAlreadyCategorized

export type State = NotCategorized | HasBeenCategorized

export class NotCategorized extends Data.TaggedClass('NotCategorized') {}

export class HasBeenCategorized extends Data.TaggedClass('HasBeenCategorized')<{
  language: LanguageCode
  keywords: ReadonlyArray<KeywordId>
  topics: ReadonlyArray<TopicId>
}> {}

export const createFilter = (reviewRequestId: Uuid.Uuid) =>
  Events.EventFilter({
    types: ['ReviewRequestForAPreprintWasCategorized', 'ReviewRequestForAPreprintWasRecategorized'],
    predicates: { reviewRequestId },
  })

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  return Array.reduce(filteredEvents, new NotCategorized(), foldStateWithPertinentEvent)
}

const foldStateWithPertinentEvent = (
  state: State,
  event: Events.ReviewRequestForAPreprintWasCategorized | Events.ReviewRequestForAPreprintWasRecategorized,
): State =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasCategorized: event =>
      Match.valueTags(state, {
        NotCategorized: () =>
          new HasBeenCategorized({
            language: event.language,
            keywords: event.keywords,
            topics: event.topics,
          }),
        HasBeenCategorized: state => state,
      }),
    ReviewRequestForAPreprintWasRecategorized: event =>
      Match.valueTags(state, {
        NotCategorized: state => state,
        HasBeenCategorized: state =>
          new HasBeenCategorized({
            language: event.language ?? state.language,
            keywords: event.keywords ?? state.keywords,
            topics: event.topics ?? state.topics,
          }),
      }),
  })

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
    Match.valueTags(state, {
      NotCategorized: () =>
        Either.right(
          Option.some(
            new Events.ReviewRequestForAPreprintWasCategorized({
              language: command.language,
              keywords: command.keywords,
              topics: command.topics,
              reviewRequestId: command.reviewRequestId,
            }),
          ),
        ),
      HasBeenCategorized: state =>
        Boolean.match(
          Boolean.every([
            Equal.equals(command.language, state.language),
            Equal.equals(command.keywords, state.keywords),
            Equal.equals(command.topics, state.topics),
          ]),
          {
            onTrue: () => Either.right(Option.none()),
            onFalse: () => Either.right(Option.some(constructRecategorizationEvent(state, command))),
          },
        ),
    }),
)

const constructRecategorizationEvent = (
  state: HasBeenCategorized,
  command: Command,
): Events.ReviewRequestForAPreprintWasRecategorized => {
  const language = Equal.equals(command.language, state.language) ? undefined : command.language
  const keywords = Equal.equals(command.keywords, state.keywords) ? undefined : command.keywords
  const topics = Equal.equals(command.topics, state.topics) ? undefined : command.topics

  return new Events.ReviewRequestForAPreprintWasRecategorized({
    reviewRequestId: command.reviewRequestId,
    language,
    keywords,
    topics,
  })
}
