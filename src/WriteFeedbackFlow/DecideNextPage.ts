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
