import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type AssignedAuthorInvite,
  type GetAuthorInviteEnv,
  type SaveAuthorInviteEnv,
  getAuthorInvite,
  saveAuthorInvite,
} from '../author-invite.js'
import { type Html, html, plainText } from '../html.js'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../http-error.js'
import { DefaultLocale } from '../locales/index.js'
import { LogInResponse, type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response.js'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
} from '../routes.js'
import type { User } from '../user.js'

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

export const authorInviteStart = ({
  id,
  user,
}: {
  id: Uuid
  user?: User
}): RT.ReaderTask<
  GetPrereviewEnv & GetAuthorInviteEnv & SaveAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS(
      'invite',
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: 'declined' }, () => RTE.left('declined' as const))
            .otherwise(RTE.right),
        ),
      ),
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.apSW('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.chainFirstW(({ invite, user }) =>
      match(invite)
        .with({ status: 'open' }, invite => saveAuthorInvite(id, { ...invite, status: 'assigned', orcid: user.orcid }))
        .with({ status: P.union('assigned', 'completed'), orcid: P.not(user.orcid) }, () =>
          RTE.left('wrong-user' as const),
        )
        .with({ status: P.union('assigned', 'completed') }, () => RTE.of(undefined))
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
          .with('no-session', () => LogInResponse({ location: format(authorInviteStartMatch.formatter, { id }) }))
          .with('not-found', () => pageNotFound(DefaultLocale))
          .with('unavailable', () => havingProblemsPage)
          .with('wrong-user', () => noPermissionPage)
          .exhaustive(),
      ({ invite }) =>
        match(invite)
          .with({ status: 'open' }, () =>
            RedirectResponse({ location: format(authorInvitePersonaMatch.formatter, { id }) }),
          )
          .with({ status: 'assigned' }, invite => carryOnPage(id, invite))
          .with({ status: 'completed' }, () =>
            RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
          )
          .exhaustive(),
    ),
  )

function nextFormMatch(invite: AssignedAuthorInvite) {
  return match(invite)
    .with({ persona: P.optional(undefined) }, () => authorInvitePersonaMatch)
    .with({ persona: P.string }, () => authorInviteCheckMatch)
    .exhaustive()
}

function carryOnPage(inviteId: Uuid, invite: AssignedAuthorInvite) {
  return StreamlinePageResponse({
    title: plainText`Be listed as an author`,
    main: html`
      <h1>Be listed as an author</h1>

      <p>As you’ve already started, we’ll take you to the next step so you can carry&nbsp;on.</p>

      <a href="${format(nextFormMatch(invite).formatter, { id: inviteId })}" role="button" draggable="false"
        >Continue</a
      >
    `,
    canonical: format(authorInviteStartMatch.formatter, { id: inviteId }),
  })
}
