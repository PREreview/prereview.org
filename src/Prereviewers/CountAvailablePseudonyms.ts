import { Array, Either, flow } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export interface Result {
  readonly used: number
  readonly legacyUsed: number
  readonly available: number
}

const createFilter = () =>
  Events.EventFilter({
    types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered'],
  })

const query =
  (possiblePseudonyms: Set<Pseudonym>) =>
  (events: ReadonlyArray<Events.Event>): Result => {
    const filter = createFilter()

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const used = Array.filter(filteredEvents, event => possiblePseudonyms.has(event.pseudonym)).length
    const legacyUsed = Array.filter(filteredEvents, event => !possiblePseudonyms.has(event.pseudonym)).length

    return {
      used,
      legacyUsed,
      available: possiblePseudonyms.size - used,
    }
  }

export const CountAvailablePseudonyms = (possiblePseudonyms: Set<Pseudonym>) =>
  Queries.OnDemandQuery({
    name: 'Prereviewers.countAvailablePseudonyms',
    createFilter,
    query: flow(query(possiblePseudonyms), Either.right),
  })
