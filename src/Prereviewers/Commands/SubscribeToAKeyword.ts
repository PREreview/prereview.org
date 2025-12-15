import { Array, Data, Function, Match, Option } from 'effect'
import * as Events from '../../Events.ts'
import type { OrcidId } from '../../types/index.ts'
import type { KeywordId } from '../../types/Keyword.ts'

export interface Command {
  readonly prereviewerId: OrcidId.OrcidId
  readonly keywordId: KeywordId
}

export type State = NotSubscribed | HasBeenSubscribed

export class NotSubscribed extends Data.TaggedClass('NotSubscribed') {}

export class HasBeenSubscribed extends Data.TaggedClass('HasBeenSubscribed') {}

export const createFilter = ({
  prereviewerId,
  keywordId,
}: Command): Events.EventFilter<Events.PrereviewerEvent['_tag']> => ({
  types: ['PrereviewerSubscribedToAKeyword'],
  predicates: { prereviewerId, keywordId },
})

export const foldState = (events: ReadonlyArray<Events.PrereviewerEvent>, command: Command): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(command)))

  return Array.match(filteredEvents, {
    onEmpty: () => new NotSubscribed(),
    onNonEmpty: () => new HasBeenSubscribed(),
  })
}

export const decide: {
  (state: State, command: Command): Option.Option<Events.PrereviewerEvent>
  (command: Command): (state: State) => Option.Option<Events.PrereviewerEvent>
} = Function.dual(
  2,
  (state: State, command: Command): Option.Option<Events.PrereviewerEvent> =>
    Match.valueTags(state, {
      HasBeenSubscribed: () => Option.none(),
      NotSubscribed: () =>
        Option.some(
          new Events.PrereviewerSubscribedToAKeyword({
            prereviewerId: command.prereviewerId,
            keywordId: command.keywordId,
          }),
        ),
    }),
)
