import { Either, Equal, flow, Match, Record } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
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

const filter = Events.EventFilter({ types: eventTypes })

type State = Record<Uuid.Uuid, { preprintId: Preprints.IndeterminatePreprintId; accepted: boolean }>

const initialState: State = Record.empty()

const updateStateWithEvent = (state: State, event: Events.Event): State => {
  if (!Events.matches(event, filter)) {
    return state
  }

  return updateStateWithPertinentEvent(state, event)
}

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasReceived: event =>
      Record.set(state, event.reviewRequestId, { preprintId: event.preprintId, accepted: false }),
    ReviewRequestForAPreprintWasAccepted: event =>
      Record.modify(state, event.reviewRequestId, review => ({ ...review, accepted: true })),
    ReviewRequestFromAPreprintServerWasImported: event =>
      Record.set(state, event.reviewRequestId, { preprintId: event.preprintId, accepted: true }),
    ReviewRequestByAPrereviewerWasImported: event =>
      Record.set(state, event.reviewRequestId, { preprintId: event.preprintId, accepted: true }),
  })

const query = (state: State, input: Input): Result => {
  return Record.some(
    state,
    reviewRequest => Equal.equals(reviewRequest.preprintId, input.preprintId) && reviewRequest.accepted,
  )
}

export const DoesAPreprintHaveAReviewRequest = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.doesAPreprintHaveAReviewRequest',
  initialState,
  updateStateWithEvent,
  query: flow(query, Either.right),
})
