import { Effect, Equal, Match, pipe } from 'effect'
import { Locale } from '../../Context.js'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import * as EnterFeedbackForm from './EnterFeedbackForm.js'
import { EnterFeedbackPage as MakeResponse } from './EnterFeedbackPage.js'

export const EnterFeedbackPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse,
  never,
  Feedback.GetFeedback | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Feedback.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return pipe(
      Match.value(feedback),
      Match.tag('FeedbackNotStarted', () => pageNotFound),
      Match.tag('FeedbackInProgress', feedback =>
        MakeResponse({
          feedbackId,
          form: EnterFeedbackForm.fromFeedback(feedback),
          locale,
          prereviewId: feedback.prereviewId,
        }),
      ),
      Match.tag('FeedbackReadyForPublishing', feedback =>
        MakeResponse({
          feedbackId,
          form: EnterFeedbackForm.fromFeedback(feedback),
          locale,
          prereviewId: feedback.prereviewId,
        }),
      ),
      Match.tag('FeedbackBeingPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) }),
      ),
      Match.tag('FeedbackPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteFeedbackPublished.href({ feedbackId }) }),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )

export const EnterFeedbackSubmission = ({
  body,
  feedbackId,
}: {
  body: unknown
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse,
  never,
  Feedback.GetFeedback | Feedback.HandleFeedbackCommand | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Feedback.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(feedback),
      Match.tag('FeedbackNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('FeedbackInProgress', 'FeedbackReadyForPublishing', feedback =>
        Effect.gen(function* () {
          const form = yield* EnterFeedbackForm.fromBody(body)

          return yield* pipe(
            Match.value(form),
            Match.tag('CompletedForm', form =>
              Effect.gen(function* () {
                const handleCommand = yield* Feedback.HandleFeedbackCommand

                yield* pipe(
                  handleCommand({
                    feedbackId,
                    command: new Feedback.EnterFeedback({ feedback: form.feedback }),
                  }),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Feedback.UnableToHandleCommand({ cause }),
                  ),
                )

                return Response.RedirectResponse({ location: Routes.WriteFeedbackCheck.href({ feedbackId }) })
              }),
            ),
            Match.tag('InvalidForm', form =>
              Effect.succeed(
                MakeResponse({
                  feedbackId,
                  form,
                  locale,
                  prereviewId: feedback.prereviewId,
                }),
              ),
            ),
            Match.exhaustive,
          )
        }),
      ),
      Match.tag('FeedbackBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) })),
      ),
      Match.tag('FeedbackPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteFeedbackPublished.href({ feedbackId }) })),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UnableToHandleCommand: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
