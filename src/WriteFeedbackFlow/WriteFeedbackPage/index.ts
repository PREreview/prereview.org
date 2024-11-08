import { Effect, Option, Record } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale, LoggedInUser } from '../../Context.js'
import { EnsureCanWriteComments } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { GetPrereview } from '../../Prereview.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { WriteFeedbackPage as MakeResponse } from './WriteFeedbackPage.js'

export const WriteFeedbackPage = ({
  id,
}: {
  id: number
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse,
  never,
  Comments.GetAllUnpublishedFeedbackByAnAuthorForAPrereview | GetPrereview | Locale
> =>
  Effect.gen(function* () {
    const user = yield* Effect.serviceOption(LoggedInUser)
    yield* EnsureCanWriteComments

    const getPrereview = yield* GetPrereview
    const locale = yield* Locale

    const prereview = yield* getPrereview(id)

    return yield* Option.match(user, {
      onNone: () => Effect.succeed(MakeResponse({ prereview, locale })),
      onSome: user =>
        Effect.gen(function* () {
          const query = yield* Comments.GetAllUnpublishedFeedbackByAnAuthorForAPrereview

          const unpublishedFeedback = yield* query({ authorId: user.orcid, prereviewId: prereview.id })

          if (!Record.isEmptyRecord(unpublishedFeedback)) {
            return Response.RedirectResponse({ location: Routes.WriteCommentStartNow.href({ id: prereview.id }) })
          }

          return MakeResponse({ prereview, locale, user })
        }),
    })
  }).pipe(
    Effect.catchTags({
      NotAllowedToWriteComments: () => Effect.succeed(pageNotFound),
      PrereviewIsNotFound: () => Effect.succeed(pageNotFound),
      PrereviewIsUnavailable: () => Effect.succeed(havingProblemsPage),
      PrereviewWasRemoved: () => Effect.succeed(pageNotFound),
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
    }),
  )
