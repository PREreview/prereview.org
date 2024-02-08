import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../../author-invite'
import { type GetContactEmailAddressEnv, maybeGetContactEmailAddress } from '../../contact-email-address'
import type { Html } from '../../html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
} from '../../routes'
import type { User } from '../../user'
import { needToVerifyEmailAddressPage } from './need-to-verify-email-address-page'

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

export const authorInviteNeedToVerifyEmailAddress = ({
  id,
  user,
}: {
  id: Uuid
  user?: User
}): RT.ReaderTask<
  GetContactEmailAddressEnv & GetPrereviewEnv & GetAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
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
    RTE.bindW('contactEmailAddress', ({ user }) => maybeGetContactEmailAddress(user.orcid)),
    RTE.matchW(
      error =>
        match(error)
          .with('already-completed', () =>
            RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
          )
          .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
          .with('no-session', () => LogInResponse({ location: format(authorInviteMatch.formatter, { id }) }))
          .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .with('wrong-user', () => noPermissionPage)
          .exhaustive(),
      state =>
        match(state)
          .with({ contactEmailAddress: { type: 'verified' } }, () =>
            RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id }) }),
          )
          .with({ contactEmailAddress: { type: 'unverified' } }, needToVerifyEmailAddressPage)
          .with({ contactEmailAddress: undefined }, () =>
            RedirectResponse({ location: format(authorInviteEnterEmailAddressMatch.formatter, { id }) }),
          )
          .exhaustive(),
    ),
  )
