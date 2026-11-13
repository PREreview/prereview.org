import { Context, Data, type Effect, type Option } from 'effect'
import type { Html } from '../../html.ts'
import type { UnableToQuery } from '../../Queries.ts'
import type { Doi } from '../../types/Doi.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { CommentCommand } from './Commands.ts'
import type { CommentError } from './Errors.ts'
import type * as Queries from './Queries.ts'
import type { CommentState } from './State.ts'

export class GetNextExpectedCommandForUserOnAComment extends Context.Service<
  GetNextExpectedCommandForUserOnAComment,
  (
    ...params: Parameters<ReturnType<typeof Queries.GetNextExpectedCommandForUserOnAComment>>
  ) => Effect.Effect<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUserOnAComment>>, UnableToQuery>
>()('GetNextExpectedCommandForUserOnAComment') {}

export class GetNextExpectedCommandForUser extends Context.Service<
  GetNextExpectedCommandForUser,
  (
    ...params: Parameters<ReturnType<typeof Queries.GetNextExpectedCommandForUser>>
  ) => Effect.Effect<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUser>>, UnableToQuery>
>()('GetNextExpectedCommandForUser') {}

export class GetComment extends Context.Service<
  GetComment,
  (commentId: Uuid.Uuid) => Effect.Effect<CommentState, UnableToQuery>
>()('GetComment') {}

export class HandleCommentCommand extends Context.Service<
  HandleCommentCommand,
  (command: CommentCommand) => Effect.Effect<void, UnableToHandleCommand | CommentError>
>()('HandleCommentCommand') {}

export class CreateRecordOnZenodoForComment extends Context.Service<
  CreateRecordOnZenodoForComment,
  (comment: InputForCommentZenodoRecord) => Effect.Effect<[Doi, number], UnableToAssignADoi>
>()('CreateRecordOnZenodoForComment') {}

export interface InputForCommentZenodoRecord {
  readonly authorId: OrcidId
  readonly competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  readonly comment: Html
  readonly persona: 'public' | 'pseudonym'
  readonly prereviewId: number
}

export class PublishCommentOnZenodo extends Context.Service<
  PublishCommentOnZenodo,
  (commentId: number) => Effect.Effect<void, UnableToPublishComment>
>()('PublishCommentOnZenodo') {}

export class UnableToAssignADoi extends Data.TaggedError('UnableToAssignADoi')<{ cause?: Error }> {}

export class UnableToPublishComment extends Data.TaggedError('UnableToPublishComment')<{ cause?: Error }> {}

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: Error }> {}
