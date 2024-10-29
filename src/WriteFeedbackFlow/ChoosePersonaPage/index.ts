import { Effect, Equal, Match, pipe } from 'effect'
import { Locale } from '../../Context.js'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import * as DecideNextPage from '../DecideNextPage.js'
import * as ChoosePersonaForm from './ChoosePersonaForm.js'
import { ChoosePersonaPage as MakeResponse } from './ChoosePersonaPage.js'

export const ChoosePersonaPage = ({
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
          form: ChoosePersonaForm.fromFeedback(feedback),
          locale,
          user,
        }),
      ),
      Match.tag('FeedbackReadyForPublishing', feedback =>
        MakeResponse({
          feedbackId,
          form: ChoosePersonaForm.fromFeedback(feedback),
          locale,
          user,
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

export const ChoosePersonaSubmission = ({
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
      Match.tag('FeedbackInProgress', 'FeedbackReadyForPublishing', () =>
        Effect.gen(function* () {
          const form = yield* ChoosePersonaForm.fromBody(body)

          return yield* pipe(
            Match.value(form),
            Match.tag('CompletedForm', form =>
              Effect.gen(function* () {
                const handleCommand = yield* Feedback.HandleFeedbackCommand

                yield* pipe(
                  handleCommand({
                    feedbackId,
                    command: new Feedback.ChoosePersona({ persona: form.persona }),
                  }),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Feedback.UnableToHandleCommand({ cause }),
                  ),
                )

                return Response.RedirectResponse({
                  location: DecideNextPage.NextPageAfterCommand({ command: 'ChoosePersona', feedback }).href({
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
                  user,
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
