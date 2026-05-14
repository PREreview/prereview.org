import { Array, Either, flow, HashMap, Order, pipe, Tuple } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export type Result = ReadonlyArray<[OrcidId, Pseudonym]>

const createFilter = () =>
  Events.EventFilter({
    types: ['RegisteredPrereviewerImported', 'LegacyPseudonymReplaced'],
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

    return pipe(Array.fromIterable(legacyPseudonymsInUse), Array.sortWith(Tuple.getSecond, Order.string))
  }

export const ListPrereviewersWithLegacyPseudonym = (possiblePseudonyms: Set<Pseudonym>) =>
  Queries.OnDemandQuery({
    name: 'Prereviewers.listPrereviewersWithLegacyPseudonym',
    createFilter,
    query: flow(query(possiblePseudonyms), Either.right),
  })
