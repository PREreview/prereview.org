import { Array, Equal, Option, Record } from 'effect'
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
    types: ['ReviewRequestForAPreprintWasAccepted'],
  })

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  const reviewRequests = Array.reduce(
    filteredEvents,
    Record.empty<Uuid.Uuid, Preprints.IndeterminatePreprintId>(),
    (map, event) =>
      Option.getOrElse(Record.replaceOption(map, event.reviewRequestId, event.preprintId), () =>
        Record.set(map, event.reviewRequestId, event.preprintId),
      ),
  )

  return Record.some(reviewRequests, Equal.equals(input.preprintId))
}
