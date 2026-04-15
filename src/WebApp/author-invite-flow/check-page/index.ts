import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
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
} from '../../../author-invite.ts'
import { type GetContactEmailAddressEnv, getContactEmailAddress } from '../../../contact-email-address.ts'
import type { Html } from '../../../html.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import {
  type GetPseudonymPersonaEnv,
  type GetPublicPersonaEnv,
  getPersona,
  getPseudonymPersona,
} from '../../../persona.ts'
import type * as Personas from '../../../Personas/index.ts'
import {
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
} from '../../../routes.ts'
import type { OrcidId, Pseudonym } from '../../../types/index.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../../http-error.ts'
import {
  LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { checkPage } from './check-page.ts'
import { failureMessage } from './failure-message.ts'

export interface Prereview {
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface AddAuthorToPrereviewEnv {
  addAuthorToPrereview: (
    prereview: number,
    author: { orcidId: OrcidId.OrcidId; pseudonym: Pseudonym.Pseudonym },
    persona: Personas.Persona,
  ) => TE.TaskEither<'unavailable', void>
}

const addAuthorToPrereview = (
  prereview: number,
  author: { orcidId: OrcidId.OrcidId; pseudonym: Pseudonym.Pseudonym },
  persona: Personas.Persona,
): RTE.ReaderTaskEither<AddAuthorToPrereviewEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ addAuthorToPrereview }) => addAuthorToPrereview(prereview, author, persona)),
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
  locale,
}: {
  id: Uuid
  method: string
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  AddAuthorToPrereviewEnv &
    GetContactEmailAddressEnv &
    GetPrereviewEnv &
    GetPublicPersonaEnv &
    GetPseudonymPersonaEnv &
    GetAuthorInviteEnv &
    SaveAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
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
    RTE.let('method', () => method),
    RTE.bindW(
      'personaChoice',
      RTE.fromNullableK('no-persona' as const)(({ invite }) => invite.persona),
    ),
    RTE.bindW('contactEmailAddress', ({ user }) =>
      pipe(
        getContactEmailAddress(user.orcid),
        RTE.filterOrElseW(
          contactEmailAddress => contactEmailAddress._tag === 'VerifiedContactEmailAddress',
          () => 'no-verified-email' as const,
        ),
        RTE.mapLeft(error => (error === 'not-found' ? ('no-verified-email' as const) : error)),
      ),
    ),
    RTE.bindW('persona', ({ personaChoice, user }) => getPersona({ orcidId: user.orcid, persona: personaChoice })),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('already-completed', () =>
              RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
            )
            .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
            .with('no-persona', () =>
              RedirectResponse({ location: format(authorInvitePersonaMatch.formatter, { id }) }),
            )
            .with('no-session', () => LogInResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('no-verified-email', () =>
              RedirectResponse({ location: format(authorInviteEnterEmailAddressMatch.formatter, { id }) }),
            )
            .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-found', () => pageNotFound(locale))
            .with(P.union('unavailable', { _tag: 'UnableToGetPersona' }), () => havingProblemsPage(locale))
            .with('wrong-user', () => noPermissionPage(locale))
            .exhaustive(),
        ),
      state =>
        match(state)
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
  locale,
}: {
  invite: AssignedAuthorInvite
  inviteId: Uuid
  persona: Personas.Persona
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    saveAuthorInvite(inviteId, { status: 'completed', orcid: invite.orcid, review: invite.review }),
    RTE.chainW(() =>
      pipe(
        getPseudonymPersona(user.orcid),
        RTE.chainW(pseudonymPersona =>
          addAuthorToPrereview(invite.review, { orcidId: user.orcid, pseudonym: pseudonymPersona.pseudonym }, persona),
        ),
        RTE.orElseFirstW(error =>
          match(error)
            .with(P.union('unavailable', { _tag: 'UnableToGetPersona' }), () => saveAuthorInvite(inviteId, invite))
            .exhaustive(),
        ),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with(P.union('unavailable', { _tag: 'UnableToGetPersona' }), () => failureMessage(locale))
          .exhaustive(),
      () =>
        RedirectResponse({
          location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        }),
    ),
  )
