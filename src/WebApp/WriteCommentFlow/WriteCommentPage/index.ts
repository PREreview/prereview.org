import { Effect, Option } from 'effect'
import { Locale } from '../../../Context.ts'
import * as PreprintReviews from '../../../Domain/PreprintReviews/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type * as Response from '../../Response/index.ts'
import { WriteCommentPage as MakeResponse } from './WriteCommentPage.ts'

export const WriteCommentPage: (input: {
  id: number
}) => Effect.Effect<Response.PageResponse, never, PreprintReviews.PreprintReviews | Locale> = Effect.fn(
  'WriteCommentFlow.WriteCommentPage',
)(
  function* ({ id }) {
    const user = yield* Effect.serviceOption(LoggedInUser)

    const locale = yield* Locale

    const prereview = yield* PreprintReviews.getPreprintReview(id)

    return MakeResponse({ prereview, locale, isLoggedIn: Option.isSome(user) })
  },
  Effect.catchTags({
    PrereviewIsNotFound: () => PageNotFound,
    PrereviewIsUnavailable: () => HavingProblemsPage,
    PrereviewWasRemoved: () => PageNotFound,
  }),
)
