import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  getContactEmailAddress,
  isUnverified,
  saveContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../../contact-email-address.ts'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage, pageNotFound } from '../http-error.ts'
import { FlashMessageResponse, LogInResponse } from '../Response/index.ts'

export type Env = EnvFor<ReturnType<typeof verifyContactEmailAddress>>

export const verifyContactEmailAddress = ({
  verify,
  locale,
  user,
}: {
  verify: Uuid
  locale: SupportedLocale
  user?: User
}) =>
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
          .with('already-verified', 'not-found', 'invalid-token', () => pageNotFound(locale))
          .with('no-session', () =>
            LogInResponse({ location: format(verifyContactEmailAddressMatch.formatter, { verify }) }),
          )
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      () =>
        FlashMessageResponse({
          location: format(myDetailsMatch.formatter, {}),
          message: 'contact-email-verified',
        }),
    ),
  )
