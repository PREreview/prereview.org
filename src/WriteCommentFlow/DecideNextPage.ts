import { Match, pipe } from 'effect'
import type * as Comments from '../Comments/index.js'
import * as Routes from '../routes.js'
import type { Uuid } from '../types/index.js'

const onInProgressCommand = pipe(
  Match.type<{
    command: (
      | Comments.EnterComment
      | Comments.ChoosePersona
      | Comments.DeclareCompetingInterests
      | Comments.AgreeToCodeOfConduct
    )['_tag']
    comment: Comments.CommentState
  }>(),
  Match.withReturnType<Routes.Route<{ commentId: Uuid.Uuid }>>(),
  Match.when(
    {
      command: command => command !== 'EnterComment',
      comment: comment => comment._tag === 'CommentInProgress' && typeof comment.comment === 'undefined',
    },
    () => Routes.WriteCommentEnterComment,
  ),
  Match.when(
    {
      command: command => command !== 'ChoosePersona',
      comment: comment => comment._tag === 'CommentInProgress' && typeof comment.persona === 'undefined',
    },
    () => Routes.WriteCommentChoosePersona,
  ),
  Match.when(
    {
      command: command => command !== 'DeclareCompetingInterests',
      comment: comment => comment._tag === 'CommentInProgress' && typeof comment.competingInterests === 'undefined',
    },
    () => Routes.WriteCommentCompetingInterests,
  ),
  Match.when(
    {
      command: command => command !== 'AgreeToCodeOfConduct',
      comment: comment => comment._tag === 'CommentInProgress' && typeof comment.codeOfConductAgreed === 'undefined',
    },
    () => Routes.WriteCommentCodeOfConduct,
  ),
  Match.orElse(() => Routes.WriteCommentCheck),
)

export const NextPageAfterCommand = pipe(
  Match.type<{
    command: Exclude<Comments.CommentCommand, Comments.MarkDoiAsAssigned | Comments.MarkCommentAsPublished>['_tag']
    comment: Comments.CommentState
  }>(),
  Match.withReturnType<Routes.Route<{ commentId: Uuid.Uuid }>>(),
  Match.when({ command: 'StartComment' }, () => Routes.WriteCommentEnterComment),
  Match.when({ command: 'EnterComment' }, onInProgressCommand),
  Match.when({ command: 'ChoosePersona' }, onInProgressCommand),
  Match.when({ command: 'DeclareCompetingInterests' }, onInProgressCommand),
  Match.when({ command: 'AgreeToCodeOfConduct' }, onInProgressCommand),
  Match.when({ command: 'PublishComment' }, () => Routes.WriteCommentPublishing),
  Match.exhaustive,
)
