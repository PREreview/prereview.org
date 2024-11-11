import type { Doi } from 'doi-ts'
import { Context, Data, type Effect, type PubSub, type Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from '../types/index.js'
import type { CommentCommand } from './Commands.js'
import type { CommentError } from './Errors.js'
import type { CommentEvent } from './Events.js'
import type { CommentBeingPublished, CommentInProgress, CommentReadyForPublishing, CommentState } from './State.js'

export class CommentEvents extends Context.Tag('CommentEvents')<
  CommentEvents,
  PubSub.PubSub<{ readonly commentId: Uuid.Uuid; readonly event: CommentEvent }>
>() {}

export class HasAuthorUnpublishedCommentsForAPrereview extends Context.Tag('HasAuthorUnpublishedCommentsForAPrereview')<
  HasAuthorUnpublishedCommentsForAPrereview,
  (params: { readonly authorId: Orcid; readonly prereviewId: number }) => Effect.Effect<boolean, UnableToQuery>
>() {}

export class GetAllUnpublishedCommentsByAnAuthorForAPrereview extends Context.Tag(
  'GetAllUnpublishedCommentsByAnAuthorForAPrereview',
)<
  GetAllUnpublishedCommentsByAnAuthorForAPrereview,
  (params: {
    readonly authorId: Orcid
    readonly prereviewId: number
  }) => Effect.Effect<
    Record.ReadonlyRecord<Uuid.Uuid, CommentInProgress | CommentReadyForPublishing | CommentBeingPublished>,
    UnableToQuery
  >
>() {}

export class GetComment extends Context.Tag('GetFeedback')<
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

export class AssignCommentADoi extends Context.Tag('AssignCommentADoi')<
  AssignCommentADoi,
  (feedback: CommentBeingPublished) => Effect.Effect<[Doi, number], UnableToAssignADoi>
>() {}

export class PublishFeedbackWithADoi extends Context.Tag('PublishFeedbackWithADoi')<
  PublishFeedbackWithADoi,
  (feedbackId: number) => Effect.Effect<void, UnableToPublishFeedback>
>() {}

export class UnableToAssignADoi extends Data.TaggedError('UnableToAssignADoi')<{ cause?: Error }> {}

export class UnableToPublishFeedback extends Data.TaggedError('UnableToPublishFeedback')<{ cause?: Error }> {}

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: Error }> {}

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: Error }> {}
