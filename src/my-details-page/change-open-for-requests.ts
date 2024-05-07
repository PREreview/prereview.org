import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error'
import {
  type IsOpenForRequests,
  type IsOpenForRequestsEnv,
  isOpenForRequests,
  saveOpenForRequests,
} from '../is-open-for-requests'
import { LogInResponse, RedirectResponse } from '../response'
import { myDetailsMatch } from '../routes'
import type { User } from '../user'
import { createFormPage } from './change-open-for-requests-form-page'

export type Env = EnvFor<ReturnType<typeof changeOpenForRequests>>

export const changeOpenForRequests = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        match(error)
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .exhaustive(),
      state =>
        match(state).with({ method: 'POST' }, handleChangeOpenForRequestsForm).otherwise(showChangeOpenForRequestsForm),
    ),
  )

const showChangeOpenForRequestsForm = flow(
  ({ user }: { user: User }) => isOpenForRequests(user.orcid),
  RTE.match(() => O.none, O.some),
  RT.map(openForRequests => createFormPage({ openForRequests })),
)

const ChangeOpenForRequestsFormD = pipe(D.struct({ openForRequests: D.literal('yes', 'no') }))

const handleChangeOpenForRequestsForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.fromEither(ChangeOpenForRequestsFormD.decode(body)),
    RTE.matchE(
      () => RT.of(createFormPage({ openForRequests: O.none, error: true })),
      flow(
        ({ openForRequests }) =>
          match(openForRequests)
            .returnType<RTE.ReaderTaskEither<IsOpenForRequestsEnv, 'unavailable', IsOpenForRequests>>()
            .with('yes', () =>
              pipe(
                RTE.Do,
                RTE.let('value', () => true),
                RTE.apS(
                  'visibility',
                  pipe(
                    isOpenForRequests(user.orcid),
                    RTE.map(openForRequests =>
                      match(openForRequests)
                        .with({ value: true, visibility: P.select() }, identity)
                        .with({ value: false }, () => 'restricted' as const)
                        .exhaustive(),
                    ),
                    RTE.orElseW(error =>
                      match(error)
                        .with('not-found', () => RTE.of('restricted' as const))
                        .otherwise(RTE.left),
                    ),
                  ),
                ),
              ),
            )
            .with('no', () => RTE.of({ value: false }))
            .exhaustive(),
        RTE.chain(openForRequests => saveOpenForRequests(user.orcid, openForRequests)),
        RTE.matchW(
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
