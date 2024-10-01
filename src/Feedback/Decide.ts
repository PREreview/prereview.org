import { Array, Either, flow, Function, Match } from 'effect'
import type * as Commands from './Commands.js'
import * as Errors from './Errors.js'
import * as Events from './Events.js'
import type * as State from './State.js'

const onStartFeedback = (command: Commands.StartFeedback) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () =>
      Either.right(
        Array.of(new Events.FeedbackWasStarted({ prereviewId: command.prereviewId, authorId: command.authorId })),
      ),
    ),
    Match.tag('FeedbackInProgress', () => Either.left(new Errors.FeedbackWasAlreadyStarted())),
    Match.tag('FeedbackReadyForPublishing', () => Either.left(new Errors.FeedbackWasAlreadyStarted())),
    Match.tag('FeedbackBeingPublished', () => Either.left(new Errors.FeedbackIsBeingPublished())),
    Match.tag('FeedbackPublished', () => Either.left(new Errors.FeedbackWasAlreadyPublished())),
    Match.exhaustive,
  )

const onEnterFeedback = (command: Commands.EnterFeedback) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () => Either.left(new Errors.FeedbackHasNotBeenStarted())),
    Match.tag('FeedbackInProgress', () =>
      Either.right(Array.of(new Events.FeedbackWasEntered({ feedback: command.feedback }))),
    ),
    Match.tag('FeedbackReadyForPublishing', () =>
      Either.right(Array.of(new Events.FeedbackWasEntered({ feedback: command.feedback }))),
    ),
    Match.tag('FeedbackBeingPublished', () => Either.left(new Errors.FeedbackIsBeingPublished())),
    Match.tag('FeedbackPublished', () => Either.left(new Errors.FeedbackWasAlreadyPublished())),
    Match.exhaustive,
  )

const onPublishFeedback = () =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () => Either.left(new Errors.FeedbackHasNotBeenStarted())),
    Match.tag('FeedbackInProgress', () => Either.left(new Errors.FeedbackIsIncomplete())),
    Match.tag('FeedbackReadyForPublishing', () => Either.right(Array.of(new Events.FeedbackPublicationWasRequested()))),
    Match.tag('FeedbackBeingPublished', () => Either.right(Array.empty())),
    Match.tag('FeedbackPublished', () => Either.left(new Errors.FeedbackWasAlreadyPublished())),
    Match.exhaustive,
  )

const onMarkFeedbackAsPublished = (command: Commands.MarkFeedbackAsPublished) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () => Either.left(new Errors.FeedbackHasNotBeenStarted())),
    Match.tag('FeedbackInProgress', () => Either.left(new Errors.FeedbackIsIncomplete())),
    Match.tag('FeedbackReadyForPublishing', () =>
      Either.right(Array.of(new Events.FeedbackWasPublished({ id: command.id, doi: command.doi }))),
    ),
    Match.tag('FeedbackBeingPublished', () =>
      Either.right(Array.of(new Events.FeedbackWasPublished({ id: command.id, doi: command.doi }))),
    ),
    Match.tag('FeedbackPublished', () => Either.left(new Errors.FeedbackWasAlreadyPublished())),
    Match.exhaustive,
  )

export const DecideFeedback = (
  state: State.FeedbackState,
): ((command: Commands.FeedbackCommand) => Either.Either<ReadonlyArray<Events.FeedbackEvent>, Errors.FeedbackError>) =>
  flow(
    Match.value,
    Match.tag('StartFeedback', onStartFeedback),
    Match.tag('EnterFeedback', onEnterFeedback),
    Match.tag('PublishFeedback', onPublishFeedback),
    Match.tag('MarkFeedbackAsPublished', onMarkFeedbackAsPublished),
    Match.exhaustive,
    Function.apply(state)<Either.Either<ReadonlyArray<Events.FeedbackEvent>, Errors.FeedbackError>>,
  )
