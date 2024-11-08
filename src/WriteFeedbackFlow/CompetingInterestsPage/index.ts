import { Effect, Equal, Match, Option, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import * as DecideNextPage from '../DecideNextPage.js'
import * as CompetingInterestsForm from './CompetingInterestsForm.js'
import { CompetingInterestsPage as MakeResponse } from './CompetingInterestsPage.js'

export const CompetingInterestsPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetFeedback | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Comments.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return pipe(
      Match.value(feedback),
      Match.tag('CommentNotStarted', () => pageNotFound),
      Match.tag('CommentInProgress', feedback =>
        MakeResponse({
          feedbackId,
          form: CompetingInterestsForm.fromFeedback(feedback),
          locale,
        }),
      ),
      Match.tag('CommentReadyForPublishing', feedback =>
        MakeResponse({
          feedbackId,
          form: CompetingInterestsForm.fromFeedback(feedback),
          locale,
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) }),
      ),
      Match.tag('CommentPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteFeedbackPublished.href({ feedbackId }) }),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(
          Response.LogInResponse({ location: Routes.WriteFeedbackCompetingInterests.href({ feedbackId }) }),
        ),
    }),
  )

export const CompetingInterestsSubmission = ({
  body,
  feedbackId,
}: {
  body: unknown
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetFeedback | Comments.HandleFeedbackCommand | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Comments.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(feedback),
      Match.tag('CommentNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentInProgress', 'CommentReadyForPublishing', () =>
        Effect.gen(function* () {
          const form = yield* CompetingInterestsForm.fromBody(body)

          return yield* pipe(
            Match.value(form),
            Match.tag('CompletedFormYes', form =>
              Effect.gen(function* () {
                const handleCommand = yield* Comments.HandleFeedbackCommand

                yield* pipe(
                  handleCommand({
                    feedbackId,
                    command: new Comments.DeclareCompetingInterests({
                      competingInterests: Option.some(form.competingInterestsDetails),
                    }),
                  }),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Comments.UnableToHandleCommand({ cause }),
                  ),
                )

                return Response.RedirectResponse({
                  location: DecideNextPage.NextPageAfterCommand({
                    command: 'DeclareCompetingInterests',
                    feedback,
                  }).href({
                    feedbackId,
                  }),
                })
              }),
            ),
            Match.tag('CompletedFormNo', () =>
              Effect.gen(function* () {
                const handleCommand = yield* Comments.HandleFeedbackCommand

                yield* pipe(
                  handleCommand({
                    feedbackId,
                    command: new Comments.DeclareCompetingInterests({
                      competingInterests: Option.none(),
                    }),
                  }),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Comments.UnableToHandleCommand({ cause }),
                  ),
                )

                return Response.RedirectResponse({
                  location: DecideNextPage.NextPageAfterCommand({
                    command: 'DeclareCompetingInterests',
                    feedback,
                  }).href({
                    feedbackId,
                  }),
                })
              }),
            ),
            Match.tag('InvalidForm', form =>
              Effect.succeed(
                MakeResponse({
                  feedbackId,
                  form,
                  locale,
                }),
              ),
            ),
            Match.exhaustive,
          )
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteFeedbackPublished.href({ feedbackId }) })),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UnableToHandleCommand: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(
          Response.LogInResponse({ location: Routes.WriteFeedbackCompetingInterests.href({ feedbackId }) }),
        ),
    }),
  )
