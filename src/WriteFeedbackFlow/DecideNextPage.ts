import { Match, pipe } from 'effect'
import type * as Feedback from '../Feedback/index.js'
import * as Routes from '../routes.js'
import type { Uuid } from '../types/index.js'

const onInProgressState = pipe(
  Match.type<Feedback.FeedbackInProgress>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.when(
    state => typeof state.feedback === 'undefined',
    () => Routes.WriteFeedbackEnterFeedback,
  ),
  Match.when(
    state => typeof state.persona === 'undefined',
    () => Routes.WriteFeedbackChoosePersona,
  ),
  Match.when(
    state => typeof state.codeOfConductAgreed === 'undefined',
    () => Routes.WriteFeedbackCodeOfConduct,
  ),
  Match.orElse(() => Routes.WriteFeedbackCheck),
)

export const NextPageFromState = pipe(
  Match.type<Exclude<Feedback.FeedbackState, Feedback.FeedbackNotStarted>>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.tag('FeedbackInProgress', onInProgressState),
  Match.tag('FeedbackReadyForPublishing', () => Routes.WriteFeedbackCheck),
  Match.tag('FeedbackBeingPublished', () => Routes.WriteFeedbackPublishing),
  Match.tag('FeedbackPublished', () => Routes.WriteFeedbackPublished),
  Match.exhaustive,
)

const onInProgressCommand = pipe(
  Match.type<{
    command: (
      | Feedback.EnterFeedback
      | Feedback.ChoosePersona
      | Feedback.DeclareCompetingInterests
      | Feedback.AgreeToCodeOfConduct
    )['_tag']
    feedback: Feedback.FeedbackState
  }>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.when(
    {
      command: command => command !== 'EnterFeedback',
      feedback: feedback => feedback._tag === 'FeedbackInProgress' && typeof feedback.feedback === 'undefined',
    },
    () => Routes.WriteFeedbackEnterFeedback,
  ),
  Match.when(
    {
      command: command => command !== 'ChoosePersona',
      feedback: feedback => feedback._tag === 'FeedbackInProgress' && typeof feedback.persona === 'undefined',
    },
    () => Routes.WriteFeedbackChoosePersona,
  ),
  Match.when(
    {
      command: command => command !== 'AgreeToCodeOfConduct',
      feedback: feedback =>
        feedback._tag === 'FeedbackInProgress' && typeof feedback.codeOfConductAgreed === 'undefined',
    },
    () => Routes.WriteFeedbackCodeOfConduct,
  ),
  Match.orElse(() => Routes.WriteFeedbackCheck),
)

export const NextPageAfterCommand = pipe(
  Match.type<{
    command: Exclude<Feedback.FeedbackCommand, Feedback.MarkDoiAsAssigned | Feedback.MarkFeedbackAsPublished>['_tag']
    feedback: Feedback.FeedbackState
  }>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.when({ command: 'StartFeedback' }, () => Routes.WriteFeedbackEnterFeedback),
  Match.when({ command: 'EnterFeedback' }, onInProgressCommand),
  Match.when({ command: 'ChoosePersona' }, onInProgressCommand),
  Match.when({ command: 'DeclareCompetingInterests' }, onInProgressCommand),
  Match.when({ command: 'AgreeToCodeOfConduct' }, onInProgressCommand),
  Match.when({ command: 'PublishFeedback' }, () => Routes.WriteFeedbackPublishing),
  Match.exhaustive,
)
