import { Multipart } from '@effect/platform'
import { Match, Schema, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { saveAvatar } from '../../avatar.ts'
import { missingE, tooBigE, wrongTypeE } from '../../form.ts'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { FlashMessageResponse, LogInResponse } from '../Response/index.ts'
import { createPage } from './change-avatar-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeAvatar>>

export const changeAvatar = ({
  body,
  locale,
  method,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  method: string
  user?: User
}) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),

    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.let('locale', () => locale),
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
          .otherwise(({ locale }) => RT.of(createPage({ form: { avatar: E.right(undefined) }, locale }))),
    ),
  )

const handleChangeAvatarForm = ({ body, locale, user }: { body: unknown; locale: SupportedLocale; user: User }) =>
  pipe(
    RTE.Do,
    RTE.let('avatar', () =>
      pipe(
        body,
        Schema.decodeUnknownEither(
          Schema.EitherFromSelf({
            left: Multipart.MultipartError,
            right: Schema.Struct({ avatar: Multipart.SingleFileSchema }),
          }),
        ),
        E.mapLeft(() => missingE()),
        E.chain(
          flow(
            E.mapLeft(error =>
              pipe(
                Match.value(error.reason),
                Match.whenOr('FileTooLarge', 'FieldTooLarge', 'BodyTooLarge', 'InternalError', () => tooBigE()),
                Match.whenOr('TooManyParts', 'Parse', () => missingE()),
                Match.exhaustive,
              ),
            ),
          ),
        ),
        E.chainW(({ avatar }) =>
          pipe(
            Match.value(avatar.contentType),
            Match.whenOr('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp', contentType =>
              E.right({ path: avatar.path, mimetype: contentType }),
            ),
            Match.orElse(() => E.left(wrongTypeE())),
          ),
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
          .with('unavailable', () => havingProblemsPage(locale))
          .with({ avatar: P.any }, error => createPage({ form: error, locale }))
          .exhaustive(),
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'avatar-changed' }),
    ),
  )
