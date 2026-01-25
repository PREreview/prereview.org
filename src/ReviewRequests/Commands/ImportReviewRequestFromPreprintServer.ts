import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Function, Match, Option } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { EmailAddress, NonEmptyString, OrcidId, SciProfilesId, Uuid } from '../../types/index.ts'

export interface Command {
  readonly publishedAt: Temporal.Instant
  readonly receivedFrom: URL
  readonly preprintId: Preprints.IndeterminatePreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requester: {
    readonly name: NonEmptyString.NonEmptyString
    readonly orcidId?: OrcidId.OrcidId
    readonly sciProfilesId?: SciProfilesId.SciProfilesId
    readonly emailAddress?: EmailAddress.EmailAddress
  }
}

export type State = NotImported | HasBeenImported

export class NotImported extends Data.TaggedClass('NotImported') {}

export class HasBeenImported extends Data.TaggedClass('HasBeenImported') {}

export const createFilter = (reviewRequestId: Uuid.Uuid): Events.EventFilter<Events.ReviewRequestEvent['_tag']> => ({
  types: [
    'ReviewRequestFromAPreprintServerWasImported',
    'ReviewRequestForAPreprintWasReceived',
    'ReviewRequestByAPrereviewerWasImported',
  ],
  predicates: { reviewRequestId },
})

export const foldState = (events: ReadonlyArray<Events.ReviewRequestEvent>, reviewRequestId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(reviewRequestId)))

  return Array.match(filteredEvents, {
    onEmpty: () => new NotImported(),
    onNonEmpty: () => new HasBeenImported(),
  })
}

export const decide: {
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent>
  (command: Command): (state: State) => Option.Option<Events.ReviewRequestEvent>
} = Function.dual(
  2,
  (state: State, command: Command): Option.Option<Events.ReviewRequestEvent> =>
    Match.valueTags(state, {
      HasBeenImported: () => Option.none(),
      NotImported: () =>
        Option.some(
          new Events.ReviewRequestFromAPreprintServerWasImported({
            publishedAt: command.publishedAt,
            receivedFrom: command.receivedFrom,
            preprintId: command.preprintId,
            reviewRequestId: command.reviewRequestId,
            requester: Option.some(command.requester),
          }),
        ),
    }),
)
