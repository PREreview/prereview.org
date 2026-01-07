import { Option, flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import type { EnvFor } from '../../Fpts.ts'
import { havingProblemsPage } from '../../http-error.ts'
import {
  type IsOpenForRequests,
  type IsOpenForRequestsEnv,
  isOpenForRequests,
  saveOpenForRequests,
} from '../../is-open-for-requests.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { LogInResponse, RedirectResponse } from '../../Response/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { createFormPage } from './change-open-for-requests-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeOpenForRequests>>

export const changeOpenForRequests = ({
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
        match(error)
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .exhaustive(),
      state =>
        match(state).with({ method: 'POST' }, handleChangeOpenForRequestsForm).otherwise(showChangeOpenForRequestsForm),
    ),
  )

const showChangeOpenForRequestsForm = ({ locale, user }: { locale: SupportedLocale; user: User }) =>
  pipe(
    isOpenForRequests(user.orcid),
    RTE.match(Option.none, Option.some),
    RT.map(openForRequests => createFormPage({ locale, openForRequests })),
  )

const ChangeOpenForRequestsFormD = pipe(D.struct({ openForRequests: D.literal('yes', 'no') }))

const handleChangeOpenForRequestsForm = ({
  body,
  locale,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeOpenForRequestsFormD.decode(body)),
    RTE.matchE(
      () => RT.of(createFormPage({ locale, openForRequests: Option.none(), error: true })),
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
          () => havingProblemsPage(locale),
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )
