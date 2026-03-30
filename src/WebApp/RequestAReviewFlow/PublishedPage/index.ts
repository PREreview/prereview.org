import { Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { LogInResponse, type PageResponse, type StreamlinePageResponse } from '../../Response/index.ts'
import { PublishedPage as MakeResponse } from './PublishedPage.ts'

export const PublishedPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<
  LogInResponse | PageResponse | StreamlinePageResponse,
  never,
  ReviewRequests.ReviewRequestQueries | Preprints.Preprints | Locale
> = Effect.fn('RequestAReviewFlow.PublishedPage')(
  function* ({ preprintId }) {
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* Preprints.getPreprintTitle(preprintId)

    yield* ReviewRequests.getPublishedReviewRequestByAPrereviewer({
      requesterId: user.orcid,
      preprintId: preprint.id,
    })

    return MakeResponse(locale, preprint.id)
  },
  (error, { preprintId }) =>
    Effect.catchTags(error, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnknownReviewRequest: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }) })),
    }),
)
