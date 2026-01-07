import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../../author-invite.ts'
import {
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
  VerifiedContactEmailAddress,
  getContactEmailAddress,
  isUnverified,
  saveContactEmailAddress,
} from '../../contact-email-address.ts'
import type { Html } from '../../html.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteVerifyEmailAddressMatch,
} from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../http-error.ts'

export interface Prereview {
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInviteVerifyEmailAddress = ({
  id,
  locale,
  user,
  verify,
}: {
  id: Uuid
  locale: SupportedLocale
  user?: User
  verify: Uuid
}): RT.ReaderTask<
  GetContactEmailAddressEnv & GetPrereviewEnv & GetAuthorInviteEnv & SaveContactEmailAddressEnv,
  FlashMessageResponse | LogInResponse | PageResponse | RedirectResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('inviteId', () => id),
    RTE.bindW('invite', ({ user }) =>
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: 'open' }, () => RTE.left('not-assigned' as const))
            .with({ status: 'declined' }, () => RTE.left('declined' as const))
            .with({ orcid: P.not(user.orcid) }, () => RTE.left('wrong-user' as const))
            .with({ status: 'completed' }, () => RTE.left('already-completed' as const))
            .with({ status: 'assigned' }, RTE.of)
            .exhaustive(),
        ),
      ),
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.bindW('contactEmailAddress', ({ user }) =>
      pipe(
        getContactEmailAddress(user.orcid),
        RTE.filterOrElseW(isUnverified, () => 'already-verified' as const),
        RTE.filterOrElseW(
          contactEmailAddress => contactEmailAddress.verificationToken === verify,
          () => 'invalid-token' as const,
        ),
      ),
    ),
    RTE.chainFirstW(({ contactEmailAddress, user }) =>
      saveContactEmailAddress(user.orcid, new VerifiedContactEmailAddress({ value: contactEmailAddress.value })),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('already-completed', () =>
            RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
          )
          .with('already-verified', () => pageNotFound(locale))
          .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
          .with('invalid-token', () => pageNotFound(locale))
          .with('no-session', () =>
            LogInResponse({ location: format(authorInviteVerifyEmailAddressMatch.formatter, { id, verify }) }),
          )
          .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
          .with('not-found', () => pageNotFound(locale))
          .with('unavailable', () => havingProblemsPage(locale))
          .with('wrong-user', () => noPermissionPage(locale))
          .exhaustive(),
      () =>
        FlashMessageResponse({
          location: format(authorInviteCheckMatch.formatter, { id }),
          message: 'contact-email-verified',
        }),
    ),
  )
