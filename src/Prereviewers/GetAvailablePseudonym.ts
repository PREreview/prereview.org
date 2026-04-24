import { Array, Data, Either, Iterable, pipe } from 'effect'
import type * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export class NoPseudonymAvailable extends Data.TaggedError('NoPseudonymAvailable') {}

export type Result = Either.Either<Pseudonym, NoPseudonymAvailable>

type State = Set<Pseudonym>

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  Array.reduce(events, state, (currentState, event) => {
    if (event._tag !== 'RegisteredPrereviewerImported' && event._tag !== 'PrereviewerRegistered') {
      return currentState
    }
    currentState.delete(event.pseudonym)
    return currentState
  })

const query = (state: State): Result =>
  pipe(
    state.values(),
    Iterable.head,
    Either.fromOption(() => new NoPseudonymAvailable()),
  )

export const GetAvailablePseudonym = (possiblePseudonyms: Set<Pseudonym>) =>
  Queries.StatefulQuery({
    name: 'Prereviewers.getAvailablePseudonym',
    initialState: new Set(possiblePseudonyms),
    updateStateWithEvents,
    query,
  })
