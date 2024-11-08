import { Match, pipe } from 'effect'
import type * as Comments from '../Comments/index.js'
import * as Routes from '../routes.js'
import type { Uuid } from '../types/index.js'

const onInProgressState = pipe(
  Match.type<Comments.CommentInProgress>(),
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
  Match.type<Exclude<Comments.CommentState, Comments.CommentNotStarted>>(),
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
      | Comments.EnterComment
      | Comments.ChoosePersona
      | Comments.DeclareCompetingInterests
      | Comments.AgreeToCodeOfConduct
    )['_tag']
    feedback: Comments.CommentState
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
    command: Exclude<Comments.CommentCommand, Comments.MarkDoiAsAssigned | Comments.MarkCommentAsPublished>['_tag']
    feedback: Comments.CommentState
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
