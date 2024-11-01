import type { Doi } from 'doi-ts'
import { Context, Data, type Effect, type Option, type PubSub, type Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from '../types/index.js'
import type { FeedbackCommand } from './Commands.js'
import type { FeedbackError } from './Errors.js'
import type { FeedbackEvent } from './Events.js'
import type { FeedbackBeingPublished, FeedbackInProgress, FeedbackReadyForPublishing, FeedbackState } from './State.js'

export class FeedbackEvents extends Context.Tag('FeedbackEvents')<
  FeedbackEvents,
  PubSub.PubSub<{ readonly feedbackId: Uuid.Uuid; readonly event: FeedbackEvent }>
>() {}

export class HasAuthorUnpublishedFeedbackForAPrereview extends Context.Tag('HasAuthorUnpublishedFeedbackForAPrereview')<
  HasAuthorUnpublishedFeedbackForAPrereview,
  (params: { readonly authorId: Orcid; readonly prereviewId: number }) => Effect.Effect<boolean, UnableToQuery>
>() {}

export class GetAllUnpublishedFeedbackByAnAuthorForAPrereview extends Context.Tag(
  'GetAllUnpublishedFeedbackByAnAuthorForAPrereview',
)<
  GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
  (params: {
    readonly authorId: Orcid
    readonly prereviewId: number
  }) => Effect.Effect<
    Record.ReadonlyRecord<Uuid.Uuid, FeedbackInProgress | FeedbackReadyForPublishing | FeedbackBeingPublished>,
    UnableToQuery
  >
>() {}

export class GetOneFeedbackWaitingToBePublished extends Context.Tag('GetOneFeedbackWaitingToBePublished ')<
  GetOneFeedbackWaitingToBePublished,
  () => Effect.Effect<Option.Option<FeedbackReadyForPublishing>, UnableToQuery>
>() {}

export class GetFeedback extends Context.Tag('GetFeedback')<
  GetFeedback,
  (feedbackId: Uuid.Uuid) => Effect.Effect<FeedbackState, UnableToQuery>
>() {}

export class HandleFeedbackCommand extends Context.Tag('HandleFeedbackCommand')<
  HandleFeedbackCommand,
  (params: {
    readonly feedbackId: Uuid.Uuid
    readonly command: FeedbackCommand
  }) => Effect.Effect<void, UnableToHandleCommand | FeedbackError>
>() {}

export class PublishFeedbackWithADoi extends Context.Tag('PublishFeedbackWithADoi')<
  PublishFeedbackWithADoi,
  (feedback: FeedbackBeingPublished) => Effect.Effect<[Doi, number], UnableToPublishFeedback>
>() {}

export class UnableToPublishFeedback extends Data.TaggedError('UnableToPublishFeedback')<{ cause?: Error }> {}

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: Error }> {}

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: Error }> {}
