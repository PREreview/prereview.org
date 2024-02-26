import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { saveAvatar } from '../avatar'
import { canUploadAvatar } from '../feature-flags'
import { type MissingE, type TooBigE, type WrongTypeE, missingE, tooBigE, wrongTypeE } from '../form'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { LogInResponse, RedirectResponse } from '../response'
import { myDetailsMatch } from '../routes'
import type { User } from '../user'
import { createPage } from './change-avatar-form-page'

export type Env = EnvFor<ReturnType<typeof changeAvatar>>

export const changeAvatar = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW(
      'canUploadAvatar',
      flow(
        RTE.fromReaderK(({ user }) => canUploadAvatar(user)),
        RTE.filterOrElse(
          canUploadAvatar => canUploadAvatar,
          () => 'not-found' as const,
        ),
      ),
    ),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(myDetailsMatch.formatter, {}) }))
            .with('not-found', () => pageNotFound)
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handleChangeAvatarForm)
          .otherwise(() => RT.of(createPage({ form: { avatar: E.right(undefined) } }))),
    ),
  )

const handleChangeAvatarForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.Do,
    RTE.let('avatar', () =>
      pipe(
        AvatarFieldD.decode(body),
        E.matchW(
          () => E.left(missingE()),
          avatar =>
            match(avatar)
              .returnType<
                E.Either<TooBigE | MissingE | WrongTypeE, { buffer: Buffer; mimetype: 'image/jpeg' | 'image/png' }>
              >()
              .with('TOO_BIG', () => E.left(tooBigE()))
              .with('ERROR', () => E.left(missingE()))
              .with({ mimetype: P.union('image/jpeg', 'image/png') }, E.right)
              .with({ mimetype: P.string }, () => E.left(wrongTypeE()))
              .exhaustive(),
        ),
      ),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('avatar', fields.avatar),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.chainFirstW(fields => saveAvatar(user.orcid, fields.avatar)),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage)
          .with({ avatar: P.any }, error => createPage({ form: error }))
          .exhaustive(),
      () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
    ),
  )

const BufferD = D.fromRefinement((value): value is Buffer => value instanceof Buffer, 'Buffer')

const FileD = D.struct({
  buffer: BufferD,
  mimetype: D.string,
})

const AvatarFieldD = pipe(
  D.struct({
    avatar: D.union(
      pipe(
        D.tuple(FileD),
        D.map(avatar => avatar[0]),
      ),
      D.literal('TOO_BIG', 'ERROR'),
    ),
  }),
  D.map(({ avatar }) => avatar),
)

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
