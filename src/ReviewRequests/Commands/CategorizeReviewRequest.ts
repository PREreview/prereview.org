import { Array, Boolean, Data, Either, Equal, Function, Match, Option, type Types } from 'effect'
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

export const createFilter = (
  reviewRequestId: Uuid.Uuid,
): Events.EventFilter<Types.Tags<Events.ReviewRequestEvent>> => ({
  types: ['ReviewRequestForAPreprintWasCategorized'],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  return Option.match(Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasCategorized')), {
    onNone: () => new NotCategorized(),
    onSome: categorized =>
      new HasBeenCategorized({
        language: categorized.language,
        keywords: categorized.keywords,
        topics: categorized.topics,
      }),
  })
}

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

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
