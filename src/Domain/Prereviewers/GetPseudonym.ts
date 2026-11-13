import { Array, Data, Result } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId, Pseudonym } from '../../types/index.ts'

export type Input = OrcidId.OrcidId

export type Result = Result.Result<Pseudonym.Pseudonym, UnknownPrereviewer>

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer')<{ cause?: unknown }> {}

const createFilter = (orcidId: Input) =>
  Events.EventFilter({
    types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered', 'LegacyPseudonymReplaced'],
    predicates: { orcidId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Result.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const registrationEvent = yield* Result.fromOption(Array.last(filteredEvents), () => new UnknownPrereviewer({}))

    return registrationEvent.pseudonym
  })

export const GetPseudonym = Queries.OnDemandQuery({
  name: 'Prereviewers.getPseudonym',
  createFilter,
  query,
})
