import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import { saveAvatar } from '../avatar.js'
import { type MissingE, type TooBigE, type WrongTypeE, missingE, tooBigE, wrongTypeE } from '../form.js'
import { havingProblemsPage } from '../http-error.js'
import { DefaultLocale } from '../locales/index.js'
import { FlashMessageResponse, LogInResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { createPage } from './change-avatar-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeAvatar>>

export const changeAvatar = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),

    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(myDetailsMatch.formatter, {}) }))
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
                E.Either<
                  TooBigE | MissingE | WrongTypeE,
                  { buffer: Buffer; mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp' }
                >
              >()
              .with('TOO_BIG', () => E.left(tooBigE()))
              .with('ERROR', () => E.left(missingE()))
              .with({ mimetype: P.union('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp') }, E.right)
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
          .with('unavailable', () => havingProblemsPage(DefaultLocale))
          .with({ avatar: P.any }, error => createPage({ form: error }))
          .exhaustive(),
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'avatar-changed' }),
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
