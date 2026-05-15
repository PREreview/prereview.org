import { Array, Data, Either, flow, HashMap, Option, pipe } from 'effect'
import type * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export class PseudonymInUse extends Data.TaggedClass('PseudonymInUse') {}

export class PseudonymNotInUse extends Data.TaggedClass('PseudonymNotInUse') {}

export class PseudonymHasBeenReplaced extends Data.TaggedClass('PseudonymHasBeenReplaced')<{
  replacedWith: Pseudonym
}> {}

export type Result = PseudonymInUse | PseudonymNotInUse | PseudonymHasBeenReplaced

export type Input = Pseudonym

interface State {
  readonly pseudonymsByOrcidId: HashMap.HashMap<OrcidId, Pseudonym>
  readonly pseudonymStates: HashMap.HashMap<Pseudonym, PseudonymInUse | PseudonymHasBeenReplaced>
}

const initialState: State = {
  pseudonymsByOrcidId: HashMap.empty(),
  pseudonymStates: HashMap.empty(),
}

const updateStateWithEvents = (state: State, events: ReadonlyArray<Events.Event>): State => {
  const pseudonymStates = HashMap.beginMutation(state.pseudonymStates)
  const pseudonymsByOrcidId = HashMap.beginMutation(state.pseudonymsByOrcidId)

  Array.forEach(events, event => {
    if (
      event._tag !== 'PrereviewerRegistered' &&
      event._tag !== 'RegisteredPrereviewerImported' &&
      event._tag !== 'LegacyPseudonymReplaced'
    ) {
      return
    }

    HashMap.set(pseudonymStates, event.pseudonym, new PseudonymInUse())

    if (event._tag === 'LegacyPseudonymReplaced') {
      const replacedPseudonym = HashMap.get(pseudonymsByOrcidId, event.orcidId)

      if (Option.isSome(replacedPseudonym)) {
        HashMap.set(
          pseudonymStates,
          replacedPseudonym.value,
          new PseudonymHasBeenReplaced({ replacedWith: event.pseudonym }),
        )
      }
    }

    HashMap.set(pseudonymsByOrcidId, event.orcidId, event.pseudonym)
  })

  return {
    pseudonymsByOrcidId: HashMap.endMutation(pseudonymsByOrcidId),
    pseudonymStates: HashMap.endMutation(pseudonymStates),
  }
}

const query = (state: State, pseudonym: Input): Result =>
  pipe(
    HashMap.get(state.pseudonymStates, pseudonym),
    Option.getOrElse(() => new PseudonymNotInUse()),
  )

export const IsPseudonymInUse: Queries.StatefulQuery<State, [Input], Result> = Queries.StatefulQuery({
  name: 'Prereviewers.isPseudonymInUse',
  initialState,
  updateStateWithEvents,
  query: flow(query, Either.right),
})
