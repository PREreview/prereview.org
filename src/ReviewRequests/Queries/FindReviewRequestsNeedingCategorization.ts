import { Array, pipe, Record, Struct } from 'effect'
import * as Events from '../../Events.ts'
import { Temporal, type Uuid } from '../../types/index.ts'

export type Result = ReadonlyArray<{ id: Uuid.Uuid; publishedAt: Temporal.Instant }>

export const filter = Events.EventFilter({
  types: [
    'ReviewRequestFromAPreprintServerWasImported',
    'ReviewRequestByAPrereviewerWasImported',
    'ReviewRequestForAPreprintWasCategorized',
  ],
})

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>): Result => {
  const state = Array.reduce(events, Record.empty<Uuid.Uuid, Temporal.Instant>(), (state, event) => {
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
