import { Data, Result, flow } from 'effect'
import type * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export class PseudonymNotInUse extends Data.TaggedError('PseudonymNotInUse') {}

export type Result = Result.Result<OrcidId, PseudonymNotInUse>

export type Input = Pseudonym

type State = unknown

declare const initialState: State

declare const updateStateWithEvents: (state: State, events: ReadonlyArray<Events.Event>) => State

declare const query: (state: State, pseudonym: Input) => Result

export const GetOrcidIdForPseudonym = Queries.StatefulQuery({
  name: 'Prereviewers.getOrcidIdForPseudonym',
  initialState,
  updateStateWithEvents,
  query: flow(query, Result.succeed),
})
