import { Array, Data, Equal, Result, flow, HashMap, Option, pipe } from 'effect'
import type * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Pseudonym } from '../../types/Pseudonym.ts'

export class PseudonymNotInUse extends Data.TaggedError('PseudonymNotInUse') {}

export type Result = Result.Result<OrcidId, PseudonymNotInUse>

export type Input = Pseudonym

interface State {
  readonly pseudonymsByOrcidId: HashMap.HashMap<OrcidId, Pseudonym>
  readonly orcidIdsByPseudonym: HashMap.HashMap<Pseudonym, OrcidId>
}

const initialState: State = {
  pseudonymsByOrcidId: HashMap.empty(),
  orcidIdsByPseudonym: HashMap.empty(),
}

const updateStateWithEvents = (state: State, events: ReadonlyArray<Events.Event>): State => {
  const pseudonymsByOrcidId = HashMap.beginMutation(state.pseudonymsByOrcidId)
  const orcidIdsByPseudonym = HashMap.beginMutation(state.orcidIdsByPseudonym)

  Array.forEach(events, event => {
    if (
      event._tag !== 'PrereviewerRegistered' &&
      event._tag !== 'RegisteredPrereviewerImported' &&
      event._tag !== 'LegacyPseudonymReplaced'
    ) {
      return
    }

    if (event._tag === 'LegacyPseudonymReplaced') {
      const replacedPseudonym = HashMap.get(pseudonymsByOrcidId, event.orcidId)

      if (
        Option.isSome(replacedPseudonym) &&
        Option.exists(HashMap.get(orcidIdsByPseudonym, replacedPseudonym.value), Equal.equals(event.orcidId))
      ) {
        HashMap.remove(orcidIdsByPseudonym, replacedPseudonym.value)
      }
    }

    HashMap.set(orcidIdsByPseudonym, event.pseudonym, event.orcidId)
    HashMap.set(pseudonymsByOrcidId, event.orcidId, event.pseudonym)
  })

  return {
    pseudonymsByOrcidId: HashMap.endMutation(pseudonymsByOrcidId),
    orcidIdsByPseudonym: HashMap.endMutation(orcidIdsByPseudonym),
  }
}

const query = (state: State, pseudonym: Input): Result =>
  pipe(
    HashMap.get(state.orcidIdsByPseudonym, pseudonym),
    Result.fromOption(() => new PseudonymNotInUse()),
  )

export const GetOrcidIdForPseudonym = Queries.StatefulQuery({
  name: 'Prereviewers.getOrcidIdForPseudonym',
  initialState,
  updateStateWithEvents,
  query: flow(query, Result.succeed),
})
