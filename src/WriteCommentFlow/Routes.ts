import { Match, pipe } from 'effect'
import type * as Comments from '../Comments/index.ts'
import * as Routes from '../routes.ts'
import type { Uuid } from '../types/index.ts'

export const RouteForCommand = pipe(
  Match.type<Exclude<Comments.ExpectedCommandForUser, Comments.ExpectedToStartAComment>>(),
  Match.withReturnType<Routes.Route<{ commentId: Uuid.Uuid }>>(),
  Match.tag('ExpectedToEnterAComment', () => Routes.WriteCommentEnterComment),
  Match.tag('ExpectedToChooseAPersona', () => Routes.WriteCommentChoosePersona),
  Match.tag('ExpectedToDeclareCompetingInterests', () => Routes.WriteCommentCompetingInterests),
  Match.tag('ExpectedToAgreeToCodeOfConduct', () => Routes.WriteCommentCodeOfConduct),
  Match.tag('ExpectedToVerifyEmailAddress', () => Routes.WriteCommentEnterEmailAddress),
  Match.tag('ExpectedToPublishComment', () => Routes.WriteCommentCheck),
  Match.exhaustive,
)
