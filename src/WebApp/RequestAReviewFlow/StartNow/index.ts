import { Effect, Match, Option } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { requestReviewCheckMatch, requestReviewPublishedMatch } from '../../../routes.ts'
import { Temporal, Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { CarryOnPage } from './CarryOnPage.ts'

export const StartNow: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<
  LogInResponse | PageResponse | RedirectResponse,
  never,
  | ReviewRequests.ReviewRequestCommands
  | ReviewRequests.ReviewRequestQueries
  | Preprints.Preprints
  | Locale
  | Uuid.GenerateUuid
> = Effect.fn('RequestAReviewFlow.StartNow')(
  function* ({ preprintId }) {
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* Preprints.getPreprintTitle(preprintId)

    const reviewRequestId = yield* ReviewRequests.findReviewRequestByAPrereviewer({
      requesterId: user.orcid,
      preprintId: preprint.id,
    })

    return yield* Option.match(reviewRequestId, {
      onNone: () =>
        Effect.gen(function* () {
          const startedAt = yield* Temporal.currentInstant
          const reviewRequestId = yield* Uuid.v4()

          yield* ReviewRequests.startReviewRequest({
            startedAt,
            preprintId: preprint.id,
            reviewRequestId,
            requesterId: user.orcid,
          })

          return RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: preprint.id }) })
        }),
      onSome: Match.valueTags({
        PublishedReviewRequest: () =>
          Effect.succeed(
            RedirectResponse({
              location: format(requestReviewPublishedMatch.formatter, { id: preprint.id }),
            }),
          ),
        ReviewRequestPendingPublication: () => Effect.succeed(CarryOnPage(locale, preprint.id)),
      }),
    })
  },
  (error, { preprintId }) =>
    Effect.catchTags(error, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      ReviewRequestWasAlreadyStarted: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewStartNow.href({ preprintId }) })),
    }),
)
