import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import type { EnvFor } from '../Fpts.js'
import {
  getContactEmailAddress,
  isUnverified,
  saveContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../contact-email-address.js'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import { FlashMessageResponse, LogInResponse } from '../response.js'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../routes.js'
import type { User } from '../user.js'

export type Env = EnvFor<ReturnType<typeof verifyContactEmailAddress>>

export const verifyContactEmailAddress = ({ verify, user }: { verify: Uuid; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW(
      'contactEmailAddress',
      flow(
        ({ user }) => getContactEmailAddress(user.orcid),
        RTE.filterOrElseW(isUnverified, () => 'already-verified' as const),
        RTE.filterOrElseW(
          contactEmailAddress => contactEmailAddress.verificationToken === verify,
          () => 'invalid-token' as const,
        ),
      ),
    ),
    RTE.chainW(({ user, contactEmailAddress }) =>
      saveContactEmailAddress(user.orcid, new VerifiedContactEmailAddress({ value: contactEmailAddress.value })),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('already-verified', 'not-found', 'invalid-token', () => pageNotFound)
          .with('no-session', () =>
            LogInResponse({ location: format(verifyContactEmailAddressMatch.formatter, { verify }) }),
          )
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () =>
        FlashMessageResponse({
          location: format(myDetailsMatch.formatter, {}),
          message: 'contact-email-verified',
        }),
    ),
  )
