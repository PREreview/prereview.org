import { Effect, Option } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Prereviews from '../../../Prereviews/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type { PageResponse } from '../../Response/index.ts'
import { WriteCommentPage as MakeResponse } from './WriteCommentPage.ts'

export const WriteCommentPage = ({
  id,
}: {
  id: number
}): Effect.Effect<PageResponse, never, Prereviews.Prereviews | Locale> =>
  Effect.gen(function* () {
    const user = yield* Effect.serviceOption(LoggedInUser)

    const locale = yield* Locale

    const prereview = yield* Prereviews.getPrereview(id)

    return MakeResponse({ prereview, locale, isLoggedIn: Option.isSome(user) })
  }).pipe(
    Effect.catchTags({
      PrereviewIsNotFound: () => PageNotFound,
      PrereviewIsUnavailable: () => HavingProblemsPage,
      PrereviewWasRemoved: () => PageNotFound,
    }),
  )
