import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../../Comments/index.ts'
import { Locale } from '../../../Context.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../Routes.ts'
import * as ChoosePersonaForm from './ChoosePersonaForm.ts'
import { ChoosePersonaPage as MakeResponse } from './ChoosePersonaPage.ts'

export const ChoosePersonaPage: (input: {
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Prereviewers.Prereviewers | Locale
> = Effect.fn('WriteCommentFlow.ChoosePersonaPage')(
  function* ({ commentId }) {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* Match.valueTags(comment, {
      CommentInProgress: comment =>
        Effect.map(
          Effect.all(
            {
              publicPersona: Prereviewers.getPublicPersona(user.orcid),
              pseudonymPersona: Prereviewers.getPseudonymPersona(user.orcid),
            },
            { concurrency: 'unbounded' },
          ),
          ({ publicPersona, pseudonymPersona }) =>
            MakeResponse({
              commentId,
              form: ChoosePersonaForm.fromComment(comment),
              locale,
              publicPersona,
              pseudonymPersona,
            }),
        ),
      CommentReadyForPublishing: comment =>
        Effect.map(
          Effect.all(
            {
              publicPersona: Prereviewers.getPublicPersona(user.orcid),
              pseudonymPersona: Prereviewers.getPseudonymPersona(user.orcid),
            },
            { concurrency: 'unbounded' },
          ),
          ({ publicPersona, pseudonymPersona }) =>
            MakeResponse({
              commentId,
              form: ChoosePersonaForm.fromComment(comment),
              locale,
              publicPersona,
              pseudonymPersona,
            }),
        ),
      CommentBeingPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      CommentPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
    })
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      UnableToGetPersona: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentChoosePersona.href({ commentId }) })),
    }),
)

export const ChoosePersonaSubmission: (input: {
  body: unknown
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  | Comments.GetComment
  | Comments.HandleCommentCommand
  | Comments.GetNextExpectedCommandForUserOnAComment
  | Prereviewers.Prereviewers
  | Locale
> = Effect.fn('WriteCommentFlow.ChoosePersonaSubmission')(
  function* ({ body, commentId }) {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag(
        'CommentInProgress',
        'CommentReadyForPublishing',
        Effect.fnUntraced(function* () {
          const form = yield* ChoosePersonaForm.fromBody(body)

          return yield* Match.valueTags(form, {
            CompletedForm: Effect.fnUntraced(function* (form) {
              const handleCommand = yield* Comments.HandleCommentCommand
              const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment

              yield* pipe(
                handleCommand(new Comments.ChoosePersona({ commentId, persona: form.persona })),
                Effect.catchIf(
                  cause => cause._tag !== 'UnableToHandleCommand',
                  cause => new Comments.UnableToHandleCommand({ cause }),
                ),
              )

              const nextCommand = yield* Effect.flatMap(
                getNextExpectedCommandForUserOnAComment(commentId),
                Effect.fromResult,
              )

              return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
            }),
            InvalidForm: form =>
              Effect.map(
                Effect.all(
                  {
                    publicPersona: Prereviewers.getPublicPersona(user.orcid),
                    pseudonymPersona: Prereviewers.getPseudonymPersona(user.orcid),
                  },
                  { concurrency: 'unbounded' },
                ),
                ({ publicPersona, pseudonymPersona }) =>
                  MakeResponse({
                    commentId,
                    form,
                    locale,
                    publicPersona,
                    pseudonymPersona,
                  }),
              ),
          })
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
      ),
      Match.exhaustive,
    )
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      CommentHasNotBeenStarted: () => HavingProblemsPage,
      CommentIsBeingPublished: () => HavingProblemsPage,
      CommentWasAlreadyPublished: () => HavingProblemsPage,
      UnableToGetPersona: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentChoosePersona.href({ commentId }) })),
    }),
)
