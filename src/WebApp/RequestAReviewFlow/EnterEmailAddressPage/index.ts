import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import { ContactEmailAddresses } from '../../../ContactEmailAddresses/index.ts'
import { Locale } from '../../../Context.ts'
import { Preprints, type IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { ReviewRequestQueries } from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { LogInResponse, RedirectResponse, type Response } from '../../Response/index.ts'
import * as EnterEmailAddressForm from './EnterEmailAddressForm.ts'
import { renderEnterEmailAddressPage } from './EnterEmailAddressPage.ts'

export const EnterEmailAddressPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | Preprints | ReviewRequestQueries> = Effect.fn(
  'RequestAReviewFlow.EnterEmailAddressPage',
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

    if (contactAddress._tag === 'VerifiedContactAddress') {
      return RedirectResponse({ location: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprint.id }) })
    }

    const form = EnterEmailAddressForm.fromContactAddress(contactAddress)

    return renderEnterEmailAddressPage({ preprintId: preprint.id, form, locale })
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

export const EnterEmailAddressSubmission: ({
  body,
  preprintId,
}: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, ContactEmailAddresses | Locale | Preprints | ReviewRequestQueries> = Effect.fn(
  'RequestAReviewFlow.EnterEmailAddressSubmission',
)(
  function* ({ body, preprintId }) {
    const preprints = yield* Preprints
    const reviewRequestQueries = yield* ReviewRequestQueries
    const contactEmailAddresses = yield* ContactEmailAddresses
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* preprints.getPreprintTitle(preprintId)

    const { contactAddress } = yield* reviewRequestQueries.doesAReviewRequestNeedAContactAddressToBeVerified({
      requesterId: user.orcid,
      preprintId,
    })

    if (contactAddress._tag === 'VerifiedContactAddress') {
      return RedirectResponse({ location: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprint.id }) })
    }

    const form = EnterEmailAddressForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fnUntraced(function* (form: EnterEmailAddressForm.CompletedForm) {
        yield* contactEmailAddresses.startVerificationOfContactEmailAddress({
          orcidId: user.orcid,
          emailAddress: form.emailAddress,
          resumeAt: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprint.id }),
        })

        return RedirectResponse({
          location: Routes.RequestAReviewNeedToVerifyEmailAddress.href({ preprintId: preprint.id }),
        })
      }),
      InvalidForm: (form: EnterEmailAddressForm.InvalidForm) =>
        Effect.succeed(renderEnterEmailAddressPage({ preprintId: preprint.id, form, locale })),
    })
  },
  (result, { preprintId }) =>
    Effect.catchTags(result, {
      ContactEmailAddressHasAlreadyBeenVerified: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewCheckYourRequest.href({ preprintId }) })),
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      ReviewRequestHasBeenPublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId }) })),
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnknownReviewRequest: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }) })),
    }),
)
