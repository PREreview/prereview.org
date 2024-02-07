import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type AssignedAuthorInvite,
  type GetAuthorInviteEnv,
  type SaveAuthorInviteEnv,
  getAuthorInvite,
  saveAuthorInvite,
} from '../../author-invite'
import { type GetContactEmailAddressEnv, maybeGetContactEmailAddress } from '../../contact-email-address'
import type { Html } from '../../html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import {
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
} from '../../routes'
import type { User } from '../../user'
import { checkPage } from './check-page'
import { failureMessage } from './failure-message'

export interface Prereview {
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface AddAuthorToPrereviewEnv {
  addAuthorToPrereview: (
    prereview: number,
    author: User,
    persona: 'public' | 'pseudonym',
  ) => TE.TaskEither<'unavailable', void>
}

const addAuthorToPrereview = (prereview: number, author: User, persona: 'public' | 'pseudonym') =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ addAuthorToPrereview }: AddAuthorToPrereviewEnv) =>
      addAuthorToPrereview(prereview, author, persona),
    ),
  )

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInviteCheck = ({
  id,
  method,
  user,
}: {
  id: Uuid
  method: string
  user?: User
}): RT.ReaderTask<
  AddAuthorToPrereviewEnv & GetContactEmailAddressEnv & GetPrereviewEnv & GetAuthorInviteEnv & SaveAuthorInviteEnv,
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
            .with({ status: 'declined' }, () => RTE.left('not-found' as const))
            .with({ orcid: P.not(user.orcid) }, () => RTE.left('wrong-user' as const))
            .with({ status: 'completed' }, () => RTE.left('already-completed' as const))
            .with({ status: 'assigned' }, RTE.of)
            .exhaustive(),
        ),
      ),
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.let('method', () => method),
    RTE.bindW(
      'persona',
      RTE.fromNullableK('no-persona' as const)(({ invite }) => invite.persona),
    ),
    RTE.bindW('contactEmailAddress', ({ user }) => maybeGetContactEmailAddress(user.orcid)),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('already-completed', () =>
              RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
            )
            .with('no-persona', () =>
              RedirectResponse({ location: format(authorInvitePersonaMatch.formatter, { id }) }),
            )
            .with('no-session', () => LogInResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .with('wrong-user', () => noPermissionPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .returnType<
            RT.ReaderTask<
              AddAuthorToPrereviewEnv & SaveAuthorInviteEnv,
              PageResponse | RedirectResponse | StreamlinePageResponse
            >
          >()
          .with({ contactEmailAddress: P.optional({ type: 'unverified' }) }, () =>
            RT.of(RedirectResponse({ location: format(authorInviteEnterEmailAddressMatch.formatter, { id }) })),
          )
          .with({ method: 'POST' }, handlePublishForm)
          .with({ method: P.string }, state => RT.of(checkPage(state)))
          .exhaustive(),
    ),
  )

const handlePublishForm = ({
  invite,
  inviteId,
  persona,
  user,
}: {
  invite: AssignedAuthorInvite
  inviteId: Uuid
  persona: 'public' | 'pseudonym'
  user: User
}) =>
  pipe(
    saveAuthorInvite(inviteId, { status: 'completed', orcid: invite.orcid, review: invite.review }),
    RTE.chainW(() =>
      pipe(
        addAuthorToPrereview(invite.review, user, persona),
        RTE.orElseFirstW(error =>
          match(error)
            .with('unavailable', () => saveAuthorInvite(inviteId, invite))
            .exhaustive(),
        ),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      () =>
        RedirectResponse({
          location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        }),
    ),
  )
