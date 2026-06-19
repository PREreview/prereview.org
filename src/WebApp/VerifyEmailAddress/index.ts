import { Effect } from 'effect'
import { ContactEmailAddresses } from '../../ContactEmailAddresses/index.ts'
import type { Locale } from '../../Context.ts'
import type { Uuid } from '../../types/Uuid.ts'
import { LoggedInUser } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import * as Response from '../Response/index.ts'
import { SanitizeRedirectTo } from './SanitizeRedirectTo.ts'

export const VerifyEmailAddress: (args: {
  readonly verificationToken: Uuid
  readonly redirectTo?: `/${string}` | undefined
}) => Effect.Effect<Response.Response, never, ContactEmailAddresses | Locale | LoggedInUser> = Effect.fn(
  'VerifyEmailAddress',
)(
  function* ({ verificationToken, redirectTo }) {
    const contactEmailAddresses = yield* ContactEmailAddresses
    const user = yield* LoggedInUser

    yield* contactEmailAddresses.verifyContactEmailAddress({ orcid: user.orcid, verificationToken })

    return Response.FlashMessageResponse({
      location: SanitizeRedirectTo(redirectTo),
      message: 'contact-email-verified',
    })
  },
  (result, { redirectTo }) =>
    Effect.catchTags(result, {
      ContactEmailAddressHasAlreadyBeenVerified: () =>
        Effect.succeed(Response.RedirectResponse({ location: SanitizeRedirectTo(redirectTo) })),
      ContactEmailAddressIsNotFound: () => PageNotFound,
      ContactEmailAddressIsUnavailable: () => HavingProblemsPage,
      VerificationTokenInvalid: () => PageNotFound,
    }),
)
