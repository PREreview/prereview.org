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
import { html, plainText, rawHtml, sendHtml } from '../html'
import { logInAndRedirect } from '../log-in'
import { getMethod, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import {
  type ResearchInterests,
  deleteResearchInterests,
  getResearchInterests,
  saveResearchInterests,
} from '../research-interests'
import { changeResearchInterestsMatch, myDetailsMatch } from '../routes'
import { NonEmptyStringC } from '../types/string'
import { type GetUserEnv, type User, getUser } from '../user'

export type Env = EnvFor<typeof changeResearchInterests>

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
    RM.chainReaderKW(researchInterests => createFormPage(user, researchInterests)),
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
            RM.of({}),
            RM.apS('value', RM.of(researchInterests)),
            RM.apS(
              'visibility',
              pipe(
                RM.fromReaderTaskEither(getResearchInterests(user.orcid)),
                RM.map(get('visibility')),
                RM.orElseW(error =>
                  match(error)
                    .with('not-found', () => RM.of('restricted' as const))
                    .otherwise(RM.left),
                ),
              ),
            ),
            RM.chainReaderTaskEitherKW(researchInterests => saveResearchInterests(user.orcid, researchInterests)),
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

function createFormPage(user: User, researchInterests: O.Option<ResearchInterests>) {
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
              .with({ value: { value: P.select() } }, rawHtml)
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

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
