import { Array, Boolean, Data, Either, Equal, Function, Match, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import type { Slack } from '../../ExternalApis/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly channelId: Slack.ChannelId
  readonly messageTimestamp: Slack.Timestamp
  readonly reviewRequestId: Uuid.Uuid
}

export type Error = Errors.ReviewRequestWasAlreadySharedOnTheCommunitySlack

export type State = NotShared | HasBeenShared

export class NotShared extends Data.TaggedClass('NotShared') {}

export class HasBeenShared extends Data.TaggedClass('HasBeenShared')<{
  readonly channelId: Slack.ChannelId
  readonly messageTimestamp: Slack.Timestamp
}> {}

export const createFilter = (
  reviewRequestId: Uuid.Uuid,
): Events.EventFilter<Types.Tags<Events.ReviewRequestEvent>> => ({
  types: ['ReviewRequestForAPreprintWasSharedOnTheCommunitySlack'],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  return Option.match(Array.findLast(filteredEvents, hasTag('ReviewRequestForAPreprintWasSharedOnTheCommunitySlack')), {
    onNone: () => new NotShared(),
    onSome: shared => new HasBeenShared({ channelId: shared.channelId, messageTimestamp: shared.messageTimestamp }),
  })
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
    Match.valueTags(state, {
      NotShared: () =>
        Either.right(
          Option.some(
            new Events.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
              channelId: command.channelId,
              messageTimestamp: command.messageTimestamp,
              reviewRequestId: command.reviewRequestId,
            }),
          ),
        ),
      HasBeenShared: ({ channelId, messageTimestamp }) =>
        Boolean.match(
          Boolean.and(
            Equal.equals(command.channelId, channelId),
            Equal.equals(command.messageTimestamp, messageTimestamp),
          ),
          {
            onTrue: () => Either.right(Option.none()),
            onFalse: () => Either.left(new Errors.ReviewRequestWasAlreadySharedOnTheCommunitySlack()),
          },
        ),
    }),
)

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
