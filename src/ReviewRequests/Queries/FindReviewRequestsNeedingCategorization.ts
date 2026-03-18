import { Array, Either, flow, HashMap, pipe, Struct } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import { Temporal, type Uuid } from '../../types/index.ts'

export type Result = ReadonlyArray<{ id: Uuid.Uuid; publishedAt: Temporal.Instant }>

const filter = Events.EventFilter({
  types: [
    'ReviewRequestForAPreprintWasPublished',
    'ReviewRequestForAPreprintWasAccepted',
    'ReviewRequestFromAPreprintServerWasImported',
    'ReviewRequestByAPrereviewerWasImported',
    'ReviewRequestForAPreprintWasWithdrawn',
    'ReviewRequestForAPreprintWasCategorized',
  ],
})

const query = (events: ReadonlyArray<Events.Event>): Result => {
  const state = HashMap.mutate(HashMap.empty<Uuid.Uuid, Temporal.Instant>(), initialState =>
    Array.reduce(events, initialState, (state, event) => {
      if (event._tag === 'ReviewRequestForAPreprintWasPublished') {
        return HashMap.set(state, event.reviewRequestId, event.publishedAt)
      }
      if (event._tag === 'ReviewRequestForAPreprintWasAccepted') {
        return HashMap.set(state, event.reviewRequestId, event.acceptedAt)
      }
      if (event._tag === 'ReviewRequestByAPrereviewerWasImported') {
        return HashMap.set(state, event.reviewRequestId, event.publishedAt)
      }
      if (event._tag === 'ReviewRequestFromAPreprintServerWasImported') {
        return HashMap.set(state, event.reviewRequestId, event.publishedAt)
      }
      if (event._tag === 'ReviewRequestForAPreprintWasWithdrawn') {
        return HashMap.remove(state, event.reviewRequestId)
      }
      if (event._tag === 'ReviewRequestForAPreprintWasCategorized') {
        return HashMap.remove(state, event.reviewRequestId)
      }
      return state
    }),
  )

  return pipe(
    Array.fromIterable(state),
    Array.map(([id, publishedAt]) => ({ id, publishedAt })),
    Array.sortWith(Struct.get('publishedAt'), Temporal.OrderInstant),
  )
}

export const FindReviewRequestsNeedingCategorization = Queries.OnDemandQuery({
  name: 'ReviewRequestQueries.findReviewRequestsNeedingCategorization',
  createFilter: () => filter,
  query: flow(query, Either.right),
})
