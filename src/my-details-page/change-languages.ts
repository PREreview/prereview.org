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
import { type Languages, deleteLanguages, getLanguages, saveLanguages } from '../languages'
import { logInAndRedirect } from '../log-in'
import { getMethod, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { changeLanguagesMatch, myDetailsMatch } from '../routes'
import { NonEmptyStringC } from '../types/string'
import { type GetUserEnv, type User, getUser } from '../user'

export type Env = EnvFor<typeof changeLanguages>

export const changeLanguages = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeLanguagesForm(state.user))
      .otherwise(() => showChangeLanguagesForm(state.user)),
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

const showChangeLanguagesForm = (user: User) =>
  pipe(
    RM.fromReaderTaskEither(getLanguages(user.orcid)),
    RM.map(O.some),
    RM.orElseW(() => RM.of(O.none)),
    RM.chainReaderKW(languages => createFormPage(user, languages)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeLanguagesFormD = pipe(D.struct({ languages: NonEmptyStringC }))

const handleChangeLanguagesForm = (user: User) =>
  pipe(
    RM.decodeBody(body => ChangeLanguagesFormD.decode(body)),
    RM.orElseW(() => RM.of({ languages: undefined })),
    RM.ichainW(({ languages }) =>
      match(languages)
        .with(P.string, languages =>
          pipe(
            RM.of({}),
            RM.apS('value', RM.of(languages)),
            RM.apS(
              'visibility',
              pipe(
                RM.fromReaderTaskEither(getLanguages(user.orcid)),
                RM.map(get('visibility')),
                RM.orElseW(error =>
                  match(error)
                    .with('not-found', () => RM.of('restricted' as const))
                    .otherwise(RM.left),
                ),
              ),
            ),
            RM.chainReaderTaskEitherKW(languages => saveLanguages(user.orcid, languages)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .with(undefined, () =>
          pipe(
            RM.fromReaderTaskEither(deleteLanguages(user.orcid)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .exhaustive(),
    ),
  )

function createFormPage(user: User, languages: O.Option<Languages>) {
  return page({
    title: plainText`What languages can you review in?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeLanguagesMatch.formatter, {})}" novalidate>
          <h1><label for="languages">What languages can you review in?</label></h1>

          <input
            name="languages"
            id="languages"
            type="text"
            ${match(languages)
              .with({ value: { value: P.select() } }, languages => html`value="${languages}"`)
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
