import { Match, pipe } from 'effect'
import type * as Feedback from '../Feedback/index.js'
import * as Routes from '../routes.js'
import type { Uuid } from '../types/index.js'

export const NextPageFromState = pipe(
  Match.type<Exclude<Feedback.FeedbackState, Feedback.FeedbackNotStarted>>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.tag('FeedbackInProgress', () => Routes.WriteFeedbackEnterFeedback),
  Match.tag('FeedbackReadyForPublishing', () => Routes.WriteFeedbackCheck),
  Match.tag('FeedbackBeingPublished', () => Routes.WriteFeedbackPublishing),
  Match.tag('FeedbackPublished', () => Routes.WriteFeedbackPublished),
  Match.exhaustive,
)

export const NextPageAfterCommand = pipe(
  Match.type<{
    command: Exclude<Feedback.FeedbackCommand, Feedback.MarkFeedbackAsPublished>['_tag']
    feedback: Feedback.FeedbackState
  }>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.when({ command: 'StartFeedback' }, () => Routes.WriteFeedbackEnterFeedback),
  Match.when({ command: 'EnterFeedback' }, () => Routes.WriteFeedbackCheck),
  Match.when({ command: 'AgreeToCodeOfConduct' }, () => Routes.WriteFeedbackCheck),
  Match.when({ command: 'PublishFeedback' }, () => Routes.WriteFeedbackPublishing),
  Match.exhaustive,
)
