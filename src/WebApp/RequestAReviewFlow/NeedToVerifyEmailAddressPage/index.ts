import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import { Preprints, type IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { ReviewRequestQueries } from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { LogInResponse, RedirectResponse, type Response } from '../../Response/index.ts'
import { renderNeedToVerifyEmailAddressPage } from './NeedToVerifyEmailAddressPage.ts'

export const NeedToVerifyEmailAddressPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | Preprints | ReviewRequestQueries> = Effect.fn(
  'RequestAReviewFlow.NeedToVerifyEmailAddressPage',
)(
  function* ({ preprintId }) {
    const preprints = yield* Preprints
    const reviewRequestQueries = yield* ReviewRequestQueries
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* preprints.getPreprintTitle(preprintId)

    const { contactAddress } = yield* reviewRequestQueries.doesAReviewRequestNeedAContactAddressToBeVerified({
      requesterId: user.orcid,
      preprintId,
    })

    return Match.valueTags(contactAddress, {
      VerifiedContactAddress: () =>
        RedirectResponse({ location: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprint.id }) }),
      UnverifiedContactAddress: contactAddress =>
        renderNeedToVerifyEmailAddressPage({ preprintId: preprint.id, emailAddress: contactAddress.value, locale }),
      NoContactAddress: () =>
        RedirectResponse({ location: Routes.RequestAReviewEnterEmailAddress.href({ preprintId: preprint.id }) }),
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
