import { Data, type Either } from 'effect'
import type * as Queries from '../Queries.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export class NoPseudonymAvailable extends Data.TaggedError('NoPseudonymAvailable') {}

export type Result = Either.Either<Pseudonym, NoPseudonymAvailable>

type State = unknown

export declare const GetAvailablePseudonym: (
  possiblePseudonyms: ReadonlyArray<Pseudonym>,
) => Queries.StatefulQuery<State, [], Pseudonym, NoPseudonymAvailable>
