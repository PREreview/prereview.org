import { Array } from 'effect'
import * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'

export type Result = ReadonlyArray<Uuid.Uuid>

export const filter = Events.EventFilter({
  types: [
    'ReviewRequestFromAPreprintServerWasImported',
    'ReviewRequestByAPrereviewerWasImported',
    'ReviewRequestForAPreprintWasCategorized',
  ],
})

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>): Result => {
  const state = Array.reduce(events, new Set<Uuid.Uuid>(), (state, event) => {
    if (event._tag === 'ReviewRequestByAPrereviewerWasImported') {
      state.add(event.reviewRequestId)
      return state
    }
    if (event._tag === 'ReviewRequestFromAPreprintServerWasImported') {
      state.add(event.reviewRequestId)
      return state
    }
    if (event._tag === 'ReviewRequestForAPreprintWasCategorized') {
      state.delete(event.reviewRequestId)
      return state
    }
    return state
  })
  return [...state]
}
