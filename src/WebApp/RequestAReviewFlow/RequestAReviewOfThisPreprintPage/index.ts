import { Effect, Option } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
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

      const { preprint, reviewRequestId } = yield* Effect.all({
        preprint: Preprints.getPreprintTitle(preprintId),
        reviewRequestId: Option.match(user, {
          onNone: () => Effect.succeedNone,
          onSome: user => ReviewRequests.findReviewRequestByAPrereviewer({ requesterId: user.orcid, preprintId }),
        }),
      })

      return Option.match(reviewRequestId, {
        onNone: () => MakeResponse({ preprint, user: Option.getOrUndefined(user), locale }),
        onSome: () =>
          Response.RedirectResponse({
            location: format(Routes.requestReviewStartMatch.formatter, { id: preprint.id }),
          }),
      })
    },
    Effect.catchTags({
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
