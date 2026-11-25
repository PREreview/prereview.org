import { Array, Result, flow } from 'effect'
import { Queries } from '../../EventSourcing/index.ts'
import type { OrcidId } from '../../types/index.ts'
import * as Events from '../Events/index.ts'

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

  return Array.isArrayNonEmpty(filteredEvents)
}

export const IsRegistered = Queries.OnDemandQuery({
  name: 'Prereviewers.isRegistered',
  createFilter,
  query: flow(query, Result.succeed),
})
