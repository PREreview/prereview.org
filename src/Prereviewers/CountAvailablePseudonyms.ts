import { Array, Either, flow, HashMap } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export interface Result {
  readonly used: number
  readonly legacyUsed: number
  readonly available: number
}

const createFilter = () =>
  Events.EventFilter({
    types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered', 'LegacyPseudonymReplaced'],
  })

const query =
  (possiblePseudonyms: Set<Pseudonym>) =>
  (events: ReadonlyArray<Events.Event>): Result => {
    const filter = createFilter()

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const currentPseudonyms = Array.reduce(
      filteredEvents,
      HashMap.empty<OrcidId, Pseudonym>(),
      (currentPseudonyms, event) => HashMap.set(currentPseudonyms, event.orcidId, event.pseudonym),
    )

    const legacyPseudonymsInUse = HashMap.filter(currentPseudonyms, pseudonym => !possiblePseudonyms.has(pseudonym))

    const legacyUsed = HashMap.size(legacyPseudonymsInUse)
    const used = HashMap.size(currentPseudonyms) - legacyUsed

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
