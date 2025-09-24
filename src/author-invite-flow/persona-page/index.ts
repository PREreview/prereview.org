import { Struct, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type AssignedAuthorInvite,
  type GetAuthorInviteEnv,
  type SaveAuthorInviteEnv,
  getAuthorInvite,
  saveAuthorInvite,
} from '../../author-invite.ts'
import { missingE } from '../../form.ts'
import type { Html } from '../../html.ts'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
} from '../../routes.ts'
import type { User } from '../../user.ts'
import { personaForm } from './persona-form.ts'

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

export const authorInvitePersona = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: Uuid
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  GetPrereviewEnv & GetAuthorInviteEnv & SaveAuthorInviteEnv,
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
    RTE.let('body', () => body),
    RTE.let('persona', ({ invite }) => invite.persona ?? 'public'),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('already-completed', () =>
              RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
            )
            .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
            .with('no-session', () => LogInResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-found', () => pageNotFound(locale))
            .with('unavailable', () => havingProblemsPage(locale))
            .with('wrong-user', () => noPermissionPage(locale))
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handlePersonaForm)
          .with({ method: P.string }, ({ invite, user, locale }) =>
            RT.of(personaForm({ form: { persona: E.right(invite.persona) }, inviteId: id, user, locale })),
          )
          .exhaustive(),
    ),
  )

const handlePersonaForm = ({
  body,
  invite,
  inviteId,
  user,
  locale,
}: {
  body: unknown
  invite: AssignedAuthorInvite
  inviteId: Uuid
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RTE.Do,
    RTE.let('persona', () => pipe(PersonaFieldD.decode(body), E.mapLeft(missingE))),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('persona', fields.persona),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.chainFirstW(fields => saveAuthorInvite(inviteId, { ...invite, persona: fields.persona })),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage(locale))
          .with({ persona: P.any }, form => personaForm({ form, inviteId, user, locale }))
          .exhaustive(),
      () => RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id: inviteId }) }),
    ),
  )

const PersonaFieldD = pipe(
  D.struct({
    persona: D.literal('public', 'pseudonym'),
  }),
  D.map(Struct.get('persona')),
)
