import { Array, Data, Either } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId, Pseudonym } from '../types/index.ts'

export type Input = OrcidId.OrcidId

export type Result = Either.Either<Pseudonym.Pseudonym, UnknownPrereviewer>

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer')<{ cause?: unknown }> {}

const createFilter = (orcidId: Input) =>
  Events.EventFilter({
    types: ['RegisteredPrereviewerImported'],
    predicates: { orcidId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const importedEvent = yield* Either.fromOption(Array.last(filteredEvents), () => new UnknownPrereviewer({}))

    return importedEvent.pseudonym
  })

export const GetPseudonym = Queries.OnDemandQuery({
  name: 'Prereviewers.getPseudonym',
  createFilter,
  query,
})
