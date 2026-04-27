import { Array, Either, flow, Predicate } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export interface Result {
  readonly used: number
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

    const filteredEvents = Array.filter(
      events,
      Predicate.compose(Events.matches(filter), event => possiblePseudonyms.has(event.pseudonym)),
    )

    return {
      used: filteredEvents.length,
      available: possiblePseudonyms.size - filteredEvents.length,
    }
  }

export const CountAvailablePseudonyms = (possiblePseudonyms: Set<Pseudonym>) =>
  Queries.OnDemandQuery({
    name: 'Prereviewers.countAvailablePseudonyms',
    createFilter,
    query: flow(query(possiblePseudonyms), Either.right),
  })
