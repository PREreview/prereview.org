import { Effect, Option } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type * as Response from '../../Response/index.ts'
import { RequestAReviewOfThisPreprintPage as MakeResponse } from './RequestAReviewOfThisPreprintPage.ts'

export const RequestAReviewOfThisPreprintPage: ({
  preprintId,
}: {
  preprintId: Preprints.IndeterminatePreprintId
}) => Effect.Effect<Response.Response, never, ReviewRequests.ReviewRequestQueries | Preprints.Preprints | Locale> =
  Effect.fn('RequestAReviewFlow.RequestAReviewOfThisPreprintPage')(
    function* ({ preprintId }) {
      const user = yield* Effect.serviceOption(LoggedInUser)
      const locale = yield* Locale

      const preprint = yield* Preprints.getPreprintTitle(preprintId)

      return MakeResponse({ preprint, isLoggedIn: Option.isSome(user), locale })
    },
    Effect.catchTags({
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
