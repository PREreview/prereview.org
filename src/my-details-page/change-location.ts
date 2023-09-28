import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { type Location, deleteLocation, getLocation, saveLocation } from '../location'
import { logInAndRedirect } from '../log-in'
import { getMethod, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { changeLocationMatch, myDetailsMatch } from '../routes'
import { NonEmptyStringC } from '../string'
import { type GetUserEnv, type User, getUser } from '../user'

export type Env = EnvFor<typeof changeLocation>

export const changeLocation = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeLocationForm(state.user))
      .otherwise(() => showChangeLocationForm(state.user)),
  ),
  RM.orElseW(error =>
    match(error)
      .returnType<
        RM.ReaderMiddleware<
          FathomEnv & GetUserEnv & OAuthEnv & PhaseEnv & PublicUrlEnv,
          StatusOpen,
          ResponseEnded,
          never,
          void
        >
      >()
      .with('no-session', () => logInAndRedirect(myDetailsMatch.formatter, {}))
      .with(P.instanceOf(Error), () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showChangeLocationForm = (user: User) =>
  pipe(
    RM.fromReaderTaskEither(getLocation(user.orcid)),
    RM.map(O.some),
    RM.orElseW(() => RM.of(O.none)),
    RM.chainReaderKW(location => createFormPage(user, location)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeLocationFormD = pipe(D.struct({ location: NonEmptyStringC }))

const handleChangeLocationForm = (user: User) =>
  pipe(
    RM.decodeBody(body => ChangeLocationFormD.decode(body)),
    RM.orElseW(() => RM.of({ location: undefined })),
    RM.ichainW(({ location }) =>
      match(location)
        .with(P.string, location =>
          pipe(
            RM.of({}),
            RM.apS('value', RM.of(location)),
            RM.apS(
              'visibility',
              pipe(
                RM.fromReaderTaskEither(getLocation(user.orcid)),
                RM.map(get('visibility')),
                RM.orElseW(error =>
                  match(error)
                    .with('not-found', () => RM.of('restricted' as const))
                    .otherwise(RM.left),
                ),
              ),
            ),
            RM.chainReaderTaskEitherKW(location => saveLocation(user.orcid, location)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .with(undefined, () =>
          pipe(
            RM.fromReaderTaskEither(deleteLocation(user.orcid)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .exhaustive(),
    ),
  )

function createFormPage(user: User, location: O.Option<Location>) {
  return page({
    title: plainText`Where are you based?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeLocationMatch.formatter, {})}" novalidate>
          <h1><label for="location">Where are you based?</label></h1>

          <input
            name="location"
            id="location"
            type="text"
            ${match(location)
              .with({ value: { value: P.select() } }, location => html`value="${location}"`)
              .when(O.isNone, () => '')
              .exhaustive()}
          />

          <button>Save and continue</button>
        </form>
      </main>
    `,
    skipLinks: [[html`Skip to form`, '#form']],
    user,
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
