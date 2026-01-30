import { Array, Equal, Match, Option, Record } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { Uuid } from '../../types/index.ts'

export interface Input {
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = boolean

const eventTypes = [
  'ReviewRequestForAPreprintWasReceived',
  'ReviewRequestForAPreprintWasAccepted',
  'ReviewRequestFromAPreprintServerWasImported',
  'ReviewRequestByAPrereviewerWasImported',
] as const

type PertinentEvent = Events.EventSubset<typeof eventTypes>

export const filter = Events.EventFilter({ types: eventTypes })

type State = Record<Uuid.Uuid, { preprintId: Preprints.IndeterminatePreprintId | undefined; accepted: boolean }>

export const InitialState: State = Record.empty()

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasReceived: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({ ...review, preprintId: event.preprintId })),
        () => Record.set(state, event.reviewRequestId, { preprintId: event.preprintId, accepted: false }),
      ),
    ReviewRequestForAPreprintWasAccepted: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({ ...review, accepted: true })),
        () => Record.set(state, event.reviewRequestId, { preprintId: undefined, accepted: true }),
      ),
    ReviewRequestFromAPreprintServerWasImported: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({ ...review, preprintId: event.preprintId })),
        () => Record.set(state, event.reviewRequestId, { preprintId: event.preprintId, accepted: true }),
      ),
    ReviewRequestByAPrereviewerWasImported: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({ ...review, preprintId: event.preprintId })),
        () => Record.set(state, event.reviewRequestId, { preprintId: event.preprintId, accepted: true }),
      ),
  })

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>, input: Input): Result => {
  const filteredEvents = Array.filter(events, Events.matches(filter))

  const reviewRequests = Array.reduce(filteredEvents, InitialState, updateStateWithPertinentEvent)

  return Record.some(
    reviewRequests,
    reviewRequest => Equal.equals(reviewRequest.preprintId, input.preprintId) && reviewRequest.accepted,
  )
}
