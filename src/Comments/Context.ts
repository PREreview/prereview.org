import type { Doi } from 'doi-ts'
import { Context, Data, type Effect, type Option, type PubSub } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'
import type { NonEmptyString, Uuid } from '../types/index.js'
import type { CommentCommand } from './Commands.js'
import type { CommentError } from './Errors.js'
import type { CommentEvent } from './Events.js'
import type * as Queries from './Queries.js'
import type { CommentState } from './State.js'

export class CommentEvents extends Context.Tag('CommentEvents')<
  CommentEvents,
  PubSub.PubSub<{ readonly commentId: Uuid.Uuid; readonly event: CommentEvent }>
>() {}

export class GetNextExpectedCommandForUserOnAComment extends Context.Tag('GetNextExpectedCommandForUserOnAComment')<
  GetNextExpectedCommandForUserOnAComment,
  (
    ...params: Parameters<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUserOnAComment>>>
  ) => Effect.Effect<
    ReturnType<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUserOnAComment>>>,
    UnableToQuery
  >
>() {}

export class GetNextExpectedCommandForUser extends Context.Tag('GetNextExpectedCommandForUser')<
  GetNextExpectedCommandForUser,
  (
    ...params: Parameters<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUser>>>
  ) => Effect.Effect<ReturnType<ReturnType<ReturnType<typeof Queries.GetNextExpectedCommandForUser>>>, UnableToQuery>
>() {}

export class GetComment extends Context.Tag('GetComment')<
  GetComment,
  (commentId: Uuid.Uuid) => Effect.Effect<CommentState, UnableToQuery>
>() {}

export class HandleCommentCommand extends Context.Tag('HandleCommentCommand')<
  HandleCommentCommand,
  (params: {
    readonly commentId: Uuid.Uuid
    readonly command: CommentCommand
  }) => Effect.Effect<void, UnableToHandleCommand | CommentError>
>() {}

export class CreateRecordOnZenodoForComment extends Context.Tag('CreateRecordOnZenodoForComment')<
  CreateRecordOnZenodoForComment,
  (comment: InputForCommentZenodoRecord) => Effect.Effect<[Doi, number], UnableToAssignADoi>
>() {}

interface InputForCommentZenodoRecord {
  readonly authorId: Orcid
  readonly competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  readonly comment: Html
  readonly persona: 'public' | 'pseudonym'
  readonly prereviewId: number
}

export class DoesUserHaveAVerifiedEmailAddress extends Context.Tag('DoesUserHaveAVerifiedEmailAddress')<
  DoesUserHaveAVerifiedEmailAddress,
  (orcid: Orcid) => Effect.Effect<boolean, UnableToQuery>
>() {}

export class PublishCommentWithADoi extends Context.Tag('PublishCommentWithADoi')<
  PublishCommentWithADoi,
  (commentId: number) => Effect.Effect<void, UnableToPublishComment>
>() {}

export class UnableToAssignADoi extends Data.TaggedError('UnableToAssignADoi')<{ cause?: Error }> {}

export class UnableToPublishComment extends Data.TaggedError('UnableToPublishComment')<{ cause?: Error }> {}

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: Error }> {}

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: Error }> {}
