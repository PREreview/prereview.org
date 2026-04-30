import { Array, Either, flow, type Types } from 'effect'
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
    types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered', 'LegacyPseudonymReplaced'],
  })

const query =
  (possiblePseudonyms: Set<Pseudonym>) =>
  (events: ReadonlyArray<Events.Event>): Result => {
    const filter = createFilter()

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const replacedPseudonyms = Array.filter(filteredEvents, hasTag('LegacyPseudonymReplaced')).length

    const used = Array.filter(filteredEvents, event => possiblePseudonyms.has(event.pseudonym)).length
    const legacyUsed =
      Array.filter(filteredEvents, event => !possiblePseudonyms.has(event.pseudonym)).length - replacedPseudonyms

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

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
