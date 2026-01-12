import { Array, Equal, Match, Option, Record } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { Uuid } from '../../types/index.ts'

export interface Input {
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = boolean

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createFilter = ({ preprintId }: Input) =>
  Events.EventFilter({
    types: ['ReviewRequestForAPreprintWasReceived', 'ReviewRequestForAPreprintWasAccepted'],
  })

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  const reviewRequests = Array.reduce(
    filteredEvents,
    Record.empty<Uuid.Uuid, { preprintId: Preprints.IndeterminatePreprintId | undefined; accepted: boolean }>(),
    (map, event) =>
      Match.valueTags(event, {
        ReviewRequestForAPreprintWasReceived: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({ ...review, preprintId: event.preprintId })),
            () => Record.set(map, event.reviewRequestId, { preprintId: event.preprintId, accepted: false }),
          ),
        ReviewRequestForAPreprintWasAccepted: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({ ...review, accepted: true })),
            () => Record.set(map, event.reviewRequestId, { preprintId: undefined, accepted: true }),
          ),
      }),
  )

  return Record.some(
    reviewRequests,
    reviewRequest => Equal.equals(reviewRequest.preprintId, input.preprintId) && reviewRequest.accepted,
  )
}
