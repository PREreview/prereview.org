import { Array, Data, Either, flow, HashMap, Option, pipe } from 'effect'
import type * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export class PseudonymInUse extends Data.TaggedClass('PseudonymInUse') {}

export class PseudonymNotInUse extends Data.TaggedClass('PseudonymNotInUse') {}

export class PseudonymHasBeenReplaced extends Data.TaggedClass('PseudonymHasBeenReplaced')<{
  replacedWith: Pseudonym
}> {}

export type Result = PseudonymInUse | PseudonymNotInUse | PseudonymHasBeenReplaced

export type Input = Pseudonym

type State = HashMap.HashMap<Pseudonym, PseudonymInUse | PseudonymHasBeenReplaced>

const initialState = HashMap.empty()

const updateStateWithEvents = (state: State, events: ReadonlyArray<Events.Event>): State => {
  return HashMap.mutate(state, mutableState =>
    Array.reduce(events, mutableState, (mutableState, event) => {
      if (event._tag !== 'PrereviewerRegistered' && event._tag !== 'RegisteredPrereviewerImported') {
        return mutableState
      }

      return HashMap.set(mutableState, event.pseudonym, new PseudonymInUse())
    }),
  )
}

const query = (state: State, pseudonym: Input): Result =>
  pipe(
    HashMap.get(state, pseudonym),
    Option.getOrElse(() => new PseudonymNotInUse()),
  )

export const IsPseudonymInUse: Queries.StatefulQuery<State, [Input], Result> = Queries.StatefulQuery({
  name: 'Prereviewers.isPseudonymInUse',
  initialState,
  updateStateWithEvents,
  query: flow(query, Either.right),
})
