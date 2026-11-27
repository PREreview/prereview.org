import { Context, type Effect } from 'effect'
import type { Uuid } from '../../types/index.ts'
import type { Commands, Queries } from '../Events/index.ts'
import type { CommentCommand } from './Commands.ts'
import type { CommentError } from './Errors.ts'
import type * as CommentQueries from './Queries.ts'
import type { CommentState } from './State.ts'

export class GetNextExpectedCommandForUserOnAComment extends Context.Service<
  GetNextExpectedCommandForUserOnAComment,
  (
    ...params: Parameters<ReturnType<typeof CommentQueries.GetNextExpectedCommandForUserOnAComment>>
  ) => Effect.Effect<
    ReturnType<ReturnType<typeof CommentQueries.GetNextExpectedCommandForUserOnAComment>>,
    Queries.UnableToQuery
  >
>()('GetNextExpectedCommandForUserOnAComment') {}

export class GetNextExpectedCommandForUser extends Context.Service<
  GetNextExpectedCommandForUser,
  (
    ...params: Parameters<ReturnType<typeof CommentQueries.GetNextExpectedCommandForUser>>
  ) => Effect.Effect<ReturnType<ReturnType<typeof CommentQueries.GetNextExpectedCommandForUser>>, Queries.UnableToQuery>
>()('GetNextExpectedCommandForUser') {}

export class GetComment extends Context.Service<
  GetComment,
  (commentId: Uuid.Uuid) => Effect.Effect<CommentState, Queries.UnableToQuery>
>()('GetComment') {}

export class HandleCommentCommand extends Context.Service<
  HandleCommentCommand,
  (command: CommentCommand) => Effect.Effect<void, Commands.UnableToHandleCommand | CommentError>
>()('HandleCommentCommand') {}
