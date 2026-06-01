import { Data, type Either } from 'effect'
import type * as Queries from '../Queries.ts'
import type { Uuid } from '../types/Uuid.ts'

export type Input = Uuid

export type Result = Either.Either<Uuid, InvitationNotFound>

export class InvitationNotFound extends Data.TaggedError('InvitationNotFound') {}

export declare const GetReviewIdForInvitation: Queries.OnDemandQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
