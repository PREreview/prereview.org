import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../../Fpts.ts'
import { type IsOpenForRequests, isOpenForRequests, saveOpenForRequests } from '../../is-open-for-requests.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { createFormPage } from './change-open-for-requests-visibility-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeOpenForRequestsVisibility>>

export const changeOpenForRequestsVisibility = ({
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
    RTE.bindW('openForRequests', ({ user }) => isOpenForRequests(user.orcid)),
    RTE.matchE(
      error =>
        match(error)
          .returnType<RT.ReaderTask<unknown, RedirectResponse | LogInResponse | PageResponse>>()
          .with('not-found', () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('unavailable', () => RT.of(havingProblemsPage(locale)))
          .exhaustive(),
      state =>
        match(state)
          .with({ openForRequests: { value: false } }, () =>
            RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })),
          )
          .with({ method: 'POST', openForRequests: { value: true } }, handleChangeOpenForRequestsVisibilityForm)
          .with({ openForRequests: { value: true } }, state => RT.of(createFormPage(state)))
          .exhaustive(),
    ),
  )

const ChangeOpenForRequestsVisibilityFormD = pipe(
  D.struct({ openForRequestsVisibility: D.literal('public', 'restricted') }),
)

const handleChangeOpenForRequestsVisibilityForm = ({
  body,
  locale,
  openForRequests,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  openForRequests: Extract<IsOpenForRequests, { value: true }>
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeOpenForRequestsVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ openForRequestsVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ openForRequestsVisibility }) => ({ ...openForRequests, visibility: openForRequestsVisibility }),
        openForRequests => saveOpenForRequests(user.orcid, openForRequests),
        RTE.matchW(
          () => havingProblemsPage(locale),
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )
