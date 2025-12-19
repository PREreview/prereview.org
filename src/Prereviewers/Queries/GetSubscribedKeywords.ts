import { Array, Struct } from 'effect'
import * as Events from '../../Events.ts'
import type { OrcidId } from '../../types/index.ts'
import type { KeywordId } from '../../types/Keyword.ts'

export type Result = ReadonlyArray<KeywordId>

export interface Input {
  prereviewerId: OrcidId.OrcidId
}

export const createFilter = ({ prereviewerId }: Input) =>
  Events.EventFilter({
    types: ['PrereviewerSubscribedToAKeyword'],
    predicates: { prereviewerId },
  })

export const query = (events: ReadonlyArray<Events.PrereviewerEvent>, input: Input): Result => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  return Array.dedupe(Array.map(filteredEvents, Struct.get('keywordId')))
}
