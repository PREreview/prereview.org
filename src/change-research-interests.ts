import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { getMethod, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { deleteResearchInterests, getResearchInterests, saveResearchInterests } from './research-interests'
import { changeResearchInterestsMatch, myDetailsMatch } from './routes'
import { type NonEmptyString, NonEmptyStringC } from './string'
import { type GetUserEnv, type User, getUser } from './user'

export const changeResearchInterests = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeResearchInterestsForm(state.user))
      .otherwise(() => showChangeResearchInterestsForm(state.user)),
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

const showChangeResearchInterestsForm = (user: User) =>
  pipe(
    RM.fromReaderTaskEither(getResearchInterests(user.orcid)),
    RM.map(O.some),
    RM.orElseW(() => RM.of(O.none)),
    chainReaderKW(researchInterests => createFormPage(user, researchInterests)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeResearchInterestsFormD = pipe(D.struct({ researchInterests: NonEmptyStringC }))

const handleChangeResearchInterestsForm = (user: User) =>
  pipe(
    RM.decodeBody(body => ChangeResearchInterestsFormD.decode(body)),
    RM.orElseW(() => RM.of({ researchInterests: undefined })),
    RM.ichainW(({ researchInterests }) =>
      match(researchInterests)
        .with(P.string, researchInterests =>
          pipe(
            RM.fromReaderTaskEither(saveResearchInterests(user.orcid, researchInterests)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .with(undefined, () =>
          pipe(
            RM.fromReaderTaskEither(deleteResearchInterests(user.orcid)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .exhaustive(),
    ),
  )

function createFormPage(user: User, researchInterests: O.Option<NonEmptyString>) {
  return page({
    title: plainText`What are your research interests?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeResearchInterestsMatch.formatter, {})}" novalidate>
          <h1><label for="research-interests">What are your research interests?</label></h1>

          <textarea name="researchInterests" id="research-interests" rows="5">
${match(researchInterests)
              .with({ value: P.select() }, rawHtml)
              .when(O.isNone, () => '')
              .exhaustive()}</textarea
          >

          <button>Save and continue</button>
        </form>
      </main>
    `,
    skipLinks: [[html`Skip to form`, '#form']],
    user,
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
