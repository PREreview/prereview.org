import { Data, type Either } from 'effect'
import type * as Queries from '../Queries.ts'
import type { OrcidId, Pseudonym } from '../types/index.ts'

export type Input = OrcidId.OrcidId

export type Result = Either.Either<Pseudonym.Pseudonym, UnknownPrereviewer>

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer')<{ cause?: unknown }> {}

export declare const GetPseudonym: Queries.OnDemandQuery<
  'RegisteredPrereviewerImported',
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
