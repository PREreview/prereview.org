import { Either, flow, Function, Match } from 'effect'
import type * as Commands from './Commands.js'
import * as Errors from './Errors.js'
import * as Events from './Events.js'
import type * as State from './State.js'

const onStartFeedback = (command: Commands.StartFeedback) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () =>
      Either.right(new Events.FeedbackWasStarted({ prereviewId: command.prereviewId, authorId: command.authorId })),
    ),
    Match.tag('FeedbackInProgress', () => Either.left(new Errors.FeedbackAlreadyStarted())),
    Match.tag('FeedbackReadyForPublishing', () => Either.left(new Errors.FeedbackAlreadyStarted())),
    Match.tag('FeedbackPublished', () => Either.left(new Errors.FeedbackAlreadyPublished())),
    Match.exhaustive,
  )

const onEnterFeedback = (command: Commands.EnterFeedback) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () => Either.left(new Errors.FeedbackNotStarted())),
    Match.tag('FeedbackInProgress', () => Either.right(new Events.FeedbackWasEntered({ feedback: command.feedback }))),
    Match.tag('FeedbackReadyForPublishing', () =>
      Either.right(new Events.FeedbackWasEntered({ feedback: command.feedback })),
    ),
    Match.tag('FeedbackPublished', () => Either.left(new Errors.FeedbackAlreadyPublished())),
    Match.exhaustive,
  )

const onMarkFeedbackAsPublished = (command: Commands.MarkFeedbackAsPublished) =>
  flow(
    Match.value<State.FeedbackState>,
    Match.tag('FeedbackNotStarted', () => Either.left(new Errors.FeedbackNotStarted())),
    Match.tag('FeedbackInProgress', () => Either.left(new Errors.FeedbackIncomplete())),
    Match.tag('FeedbackReadyForPublishing', () =>
      Either.right(new Events.FeedbackWasPublished({ id: command.id, doi: command.doi })),
    ),
    Match.tag('FeedbackPublished', () => Either.left(new Errors.FeedbackAlreadyPublished())),
    Match.exhaustive,
  )

export const DecideFeedback = (
  state: State.FeedbackState,
): ((command: Commands.FeedbackCommand) => Either.Either<Events.FeedbackEvent, Errors.FeedbackError>) =>
  flow(
    Match.value,
    Match.tag('StartFeedback', onStartFeedback),
    Match.tag('EnterFeedback', onEnterFeedback),
    Match.tag('MarkFeedbackAsPublished', onMarkFeedbackAsPublished),
    Match.exhaustive,
    Function.apply(state)<Either.Either<Events.FeedbackEvent, Errors.FeedbackError>>,
  )
