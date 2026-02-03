import { Array, Either, flow, pipe, Record, Struct } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import { Temporal, type Uuid } from '../../types/index.ts'

export type Result = ReadonlyArray<{ id: Uuid.Uuid; publishedAt: Temporal.Instant }>

const filter = Events.EventFilter({
  types: [
    'ReviewRequestForAPreprintWasAccepted',
    'ReviewRequestFromAPreprintServerWasImported',
    'ReviewRequestByAPrereviewerWasImported',
    'ReviewRequestForAPreprintWasCategorized',
  ],
})

const query = (events: ReadonlyArray<Events.Event>): Result => {
  const state = Array.reduce(events, Record.empty<Uuid.Uuid, Temporal.Instant>(), (state, event) => {
    if (event._tag === 'ReviewRequestForAPreprintWasAccepted') {
      return Record.set(state, event.reviewRequestId, event.acceptedAt)
    }
    if (event._tag === 'ReviewRequestByAPrereviewerWasImported') {
      return Record.set(state, event.reviewRequestId, event.publishedAt)
    }
    if (event._tag === 'ReviewRequestFromAPreprintServerWasImported') {
      return Record.set(state, event.reviewRequestId, event.publishedAt)
    }
    if (event._tag === 'ReviewRequestForAPreprintWasCategorized') {
      return Record.remove(state, event.reviewRequestId)
    }
    return state
  })

  return pipe(
    Record.toEntries(state),
    Array.map(([id, publishedAt]) => ({ id, publishedAt })),
    Array.sortWith(Struct.get('publishedAt'), Temporal.OrderInstant),
  )
}

export const FindReviewRequestsNeedingCategorization = Queries.OnDemandQuery({
  name: 'ReviewRequestQueries.findReviewRequestsNeedingCategorization',
  createFilter: () => filter,
  query: flow(query, Either.right),
})
