import type { UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import { type IndeterminatePreprintId, Preprints } from '../../../Preprints/index.ts'
import { ReviewRequestQueries } from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { LogInResponse, RedirectResponse, type Response } from '../../Response/index.ts'
import * as ReceiveNotificationsForm from './ReceiveNotificationsForm.ts'
import { renderReceiveNotificationsPage } from './ReceiveNotificationsPage.ts'

export const ReceiveNotificationsPage: (input: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | Preprints | ReviewRequestQueries> = Effect.fn(
  'RequestAReviewFlow.ReceiveNotificationsPage',
)(
  function* ({ preprintId }) {
    const preprints = yield* Preprints
    const reviewRequestQueries = yield* ReviewRequestQueries
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* preprints.getPreprintTitle(preprintId)

    const needADecision = yield* reviewRequestQueries.doesAReviewRequestNeedADecisionOnReviewNotifications({
      requesterId: user.orcid,
      preprintId,
    })

    if (!needADecision) {
      return RedirectResponse({ location: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprint.id }) })
    }

    return renderReceiveNotificationsPage({
      form: new ReceiveNotificationsForm.EmptyForm(),
      locale,
      preprintId: preprint.id,
    })
  },
  (result, { preprintId }) =>
    Effect.catchTags(result, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      ReviewRequestHasBeenPublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId }) })),
      UnableToQuery: () => HavingProblemsPage,
      UnknownReviewRequest: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }) })),
    }),
)

export const ReceiveNotificationsSubmission: (input: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | Preprints | ReviewRequestQueries> = Effect.fn(
  'RequestAReviewFlow.ReceiveNotificationsSubmission',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
)(function* ({ body, preprintId }) {
  return yield* HavingProblemsPage
})
