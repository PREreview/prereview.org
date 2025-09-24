import type { Doi } from 'doi-ts'
import { Context, Data, type Effect, type Option } from 'effect'
import type { Html } from '../html.ts'
import type { NonEmptyString, Uuid } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { CommentCommand } from './Commands.ts'
import type { CommentError } from './Errors.ts'
import type * as Queries from './Queries.ts'
import type { CommentState } from './State.ts'

export class GetNextExpectedCommandForUserOnAComment extends Context.Tag('GetNextExpectedCommandForUserOnAComment')<
  GetNextExpectedCommandForUserOnAComment,
  (
    ...params: Parameters<ReturnType<typeof Queries.GetNextExpectedCommandForUserOnAComment>>
  ) => Effect.Effect<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUserOnAComment>>, UnableToQuery>
>() {}

export class GetNextExpectedCommandForUser extends Context.Tag('GetNextExpectedCommandForUser')<
  GetNextExpectedCommandForUser,
  (
    ...params: Parameters<ReturnType<typeof Queries.GetNextExpectedCommandForUser>>
  ) => Effect.Effect<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUser>>, UnableToQuery>
>() {}

export class GetComment extends Context.Tag('GetComment')<
  GetComment,
  (commentId: Uuid.Uuid) => Effect.Effect<CommentState, UnableToQuery>
>() {}

export class HandleCommentCommand extends Context.Tag('HandleCommentCommand')<
  HandleCommentCommand,
  (command: CommentCommand) => Effect.Effect<void, UnableToHandleCommand | CommentError>
>() {}

export class CreateRecordOnZenodoForComment extends Context.Tag('CreateRecordOnZenodoForComment')<
  CreateRecordOnZenodoForComment,
  (comment: InputForCommentZenodoRecord) => Effect.Effect<[Doi, number], UnableToAssignADoi>
>() {}

export interface InputForCommentZenodoRecord {
  readonly authorId: OrcidId
  readonly competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  readonly comment: Html
  readonly persona: 'public' | 'pseudonym'
  readonly prereviewId: number
}

export class DoesUserHaveAVerifiedEmailAddress extends Context.Tag('DoesUserHaveAVerifiedEmailAddress')<
  DoesUserHaveAVerifiedEmailAddress,
  (orcid: OrcidId) => Effect.Effect<boolean, UnableToQuery>
>() {}

export class PublishCommentOnZenodo extends Context.Tag('PublishCommentOnZenodo')<
  PublishCommentOnZenodo,
  (commentId: number) => Effect.Effect<void, UnableToPublishComment>
>() {}

export class UnableToAssignADoi extends Data.TaggedError('UnableToAssignADoi')<{ cause?: Error }> {}

export class UnableToPublishComment extends Data.TaggedError('UnableToPublishComment')<{ cause?: Error }> {}

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: Error }> {}

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: Error }> {}
