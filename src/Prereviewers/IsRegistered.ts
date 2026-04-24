import { Array, Either, flow } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/index.ts'

export type Input = OrcidId.OrcidId

export type Result = boolean

const createFilter = (orcidId: Input) =>
  Events.EventFilter({
    types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered'],
    predicates: { orcidId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  return Array.isNonEmptyArray(filteredEvents)
}

export const IsRegistered = Queries.OnDemandQuery({
  name: 'Prereviewers.isRegistered',
  createFilter,
  query: flow(query, Either.right),
})
