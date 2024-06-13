import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error.js'
import { type IsOpenForRequests, isOpenForRequests, saveOpenForRequests } from '../is-open-for-requests.js'
import { LogInResponse, type PageResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { createFormPage } from './change-open-for-requests-visibility-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeOpenForRequestsVisibility>>

export const changeOpenForRequestsVisibility = ({
  body,
  method,
  user,
}: {
  body: unknown
  method: string
  user?: User
}) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.bindW('openForRequests', ({ user }) => isOpenForRequests(user.orcid)),
    RTE.matchE(
      error =>
        match(error)
          .returnType<RT.ReaderTask<unknown, RedirectResponse | LogInResponse | PageResponse>>()
          .with('not-found', () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('unavailable', () => RT.of(havingProblemsPage))
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
  openForRequests,
  user,
}: {
  body: unknown
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
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
