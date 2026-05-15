import { Data } from 'effect'
import type * as Queries from '../Queries.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'

export class PseudonymInUse extends Data.TaggedClass('PseudonymInUse') {}

export class PseudonymNotInUse extends Data.TaggedClass('PseudonymNotInUse') {}

export class PseudonymHasBeenReplaced extends Data.TaggedClass('PseudonymHasBeenReplaced')<{
  replacedWith: Pseudonym
}> {}

export type Result = PseudonymInUse | PseudonymNotInUse | PseudonymHasBeenReplaced

export type Input = Pseudonym

type State = unknown

export declare const IsPseudonymInUse: Queries.StatefulQuery<State, [Input], Result>
