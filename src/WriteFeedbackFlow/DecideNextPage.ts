import { Match, pipe } from 'effect'
import type * as Feedback from '../Feedback/index.js'
import * as Routes from '../routes.js'
import type { Uuid } from '../types/index.js'

const onInProgressState = pipe(
  Match.type<Feedback.CommentInProgress>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.when(
    state => typeof state.comment === 'undefined',
    () => Routes.WriteFeedbackEnterFeedback,
  ),
  Match.when(
    state => typeof state.persona === 'undefined',
    () => Routes.WriteFeedbackChoosePersona,
  ),
  Match.when(
    state => typeof state.competingInterests === 'undefined',
    () => Routes.WriteFeedbackCompetingInterests,
  ),
  Match.when(
    state => typeof state.codeOfConductAgreed === 'undefined',
    () => Routes.WriteFeedbackCodeOfConduct,
  ),
  Match.orElse(() => Routes.WriteFeedbackCheck),
)

export const NextPageFromState = pipe(
  Match.type<Exclude<Feedback.CommentState, Feedback.CommentNotStarted>>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.tag('CommentInProgress', onInProgressState),
  Match.tag('CommentReadyForPublishing', () => Routes.WriteFeedbackCheck),
  Match.tag('CommentBeingPublished', () => Routes.WriteFeedbackPublishing),
  Match.tag('CommentPublished', () => Routes.WriteFeedbackPublished),
  Match.exhaustive,
)

const onInProgressCommand = pipe(
  Match.type<{
    command: (
      | Feedback.EnterComment
      | Feedback.ChoosePersona
      | Feedback.DeclareCompetingInterests
      | Feedback.AgreeToCodeOfConduct
    )['_tag']
    feedback: Feedback.CommentState
  }>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.when(
    {
      command: command => command !== 'EnterComment',
      feedback: feedback => feedback._tag === 'CommentInProgress' && typeof feedback.comment === 'undefined',
    },
    () => Routes.WriteFeedbackEnterFeedback,
  ),
  Match.when(
    {
      command: command => command !== 'ChoosePersona',
      feedback: feedback => feedback._tag === 'CommentInProgress' && typeof feedback.persona === 'undefined',
    },
    () => Routes.WriteFeedbackChoosePersona,
  ),
  Match.when(
    {
      command: command => command !== 'DeclareCompetingInterests',
      feedback: feedback => feedback._tag === 'CommentInProgress' && typeof feedback.competingInterests === 'undefined',
    },
    () => Routes.WriteFeedbackCompetingInterests,
  ),
  Match.when(
    {
      command: command => command !== 'AgreeToCodeOfConduct',
      feedback: feedback =>
        feedback._tag === 'CommentInProgress' && typeof feedback.codeOfConductAgreed === 'undefined',
    },
    () => Routes.WriteFeedbackCodeOfConduct,
  ),
  Match.orElse(() => Routes.WriteFeedbackCheck),
)

export const NextPageAfterCommand = pipe(
  Match.type<{
    command: Exclude<Feedback.CommentCommand, Feedback.MarkDoiAsAssigned | Feedback.MarkCommentAsPublished>['_tag']
    feedback: Feedback.CommentState
  }>(),
  Match.withReturnType<Routes.Route<{ feedbackId: Uuid.Uuid }>>(),
  Match.when({ command: 'StartComment' }, () => Routes.WriteFeedbackEnterFeedback),
  Match.when({ command: 'EnterComment' }, onInProgressCommand),
  Match.when({ command: 'ChoosePersona' }, onInProgressCommand),
  Match.when({ command: 'DeclareCompetingInterests' }, onInProgressCommand),
  Match.when({ command: 'AgreeToCodeOfConduct' }, onInProgressCommand),
  Match.when({ command: 'PublishComment' }, () => Routes.WriteFeedbackPublishing),
  Match.exhaustive,
)
