import { Effect, Option } from 'effect'
import * as Comments from '../../../Comments/index.ts'
import { Locale } from '../../../Context.ts'
import * as Prereviews from '../../../Prereviews/index.ts'
import * as Response from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { WriteCommentPage as MakeResponse } from './WriteCommentPage.ts'

export const WriteCommentPage = ({
  id,
}: {
  id: number
}): Effect.Effect<
  Response.PageResponse | Response.RedirectResponse,
  never,
  Comments.GetNextExpectedCommandForUser | Prereviews.Prereviews | Locale
> =>
  Effect.gen(function* () {
    const user = yield* Effect.serviceOption(LoggedInUser)

    const locale = yield* Locale

    const prereview = yield* Prereviews.getPrereview(id)

    return yield* Option.match(user, {
      onNone: () => Effect.succeed(MakeResponse({ prereview, locale })),
      onSome: user =>
        Effect.gen(function* () {
          const getNextExpectedCommandForUser = yield* Comments.GetNextExpectedCommandForUser

          const nextCommand = yield* getNextExpectedCommandForUser({ authorId: user.orcid, prereviewId: prereview.id })

          if (nextCommand._tag !== 'ExpectedToStartAComment') {
            return Response.RedirectResponse({ location: Routes.WriteCommentStartNow.href({ id: prereview.id }) })
          }

          return MakeResponse({ prereview, locale, user })
        }),
    })
  }).pipe(
    Effect.catchTags({
      PrereviewIsNotFound: () => PageNotFound,
      PrereviewIsUnavailable: () => HavingProblemsPage,
      PrereviewWasRemoved: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
