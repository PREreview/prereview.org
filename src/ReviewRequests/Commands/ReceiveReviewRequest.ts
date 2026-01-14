import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Function, Match, Option } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { EmailAddress, NonEmptyString, OrcidId, SciProfilesId, Uuid } from '../../types/index.ts'

export interface Command {
  readonly receivedAt: Temporal.Instant
  readonly preprintId: Preprints.IndeterminatePreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requester: {
    readonly name: NonEmptyString.NonEmptyString
    readonly orcidId?: OrcidId.OrcidId
    readonly sciProfilesId?: SciProfilesId.SciProfilesId
    readonly emailAddress?: EmailAddress.EmailAddress
  }
}

export type State = NotReceived | HasBeenReceived

export class NotReceived extends Data.TaggedClass('NotReceived') {}

export class HasBeenReceived extends Data.TaggedClass('HasBeenReceived') {}

export const createFilter = (reviewRequestId: Uuid.Uuid): Events.EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: ['ReviewRequestForAPreprintWasReceived', 'ReviewRequestForAPreprintWasImported'],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  return Array.match(filteredEvents, {
    onEmpty: () => new NotReceived(),
    onNonEmpty: () => new HasBeenReceived(),
  })
}

export const decide: {
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent>
  (command: Command): (state: State) => Option.Option<Events.ReviewRequestEvent>
} = Function.dual(
  2,
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent> =>
    Match.valueTags(state, {
      HasBeenReceived: () => Option.none(),
      NotReceived: () =>
        Option.some(
          new Events.ReviewRequestForAPreprintWasReceived({
            receivedAt: command.receivedAt,
            preprintId: command.preprintId,
            reviewRequestId: command.reviewRequestId,
            requester: Option.some(command.requester),
          }),
        ),
    }),
)
