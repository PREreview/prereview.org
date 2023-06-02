import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { myDetailsMatch } from './routes'
import { getUser } from './user'
import type { GetUserEnv, User } from './user'

export const myDetails = pipe(
  getUser,
  chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(error =>
    match(error)
      .with(
        'no-session',
        () =>
          logInAndRedirect(myDetailsMatch.formatter, {}) as RM.ReaderMiddleware<
            GetUserEnv & FathomEnv & PhaseEnv & PublicUrlEnv & OAuthEnv,
            StatusOpen,
            ResponseEnded,
            never,
            void
          >,
      )
      .with(P.instanceOf(Error), () => serviceUnavailable)
      .exhaustive(),
  ),
)

function createPage(user: User) {
  return page({
    title: plainText`My details`,
    content: html`
      <main id="main-content">
        <h1>My details</h1>

        <dl>
          <div>
            <dt>ORCID iD</dt>
            <dd><a href="https://orcid.org/${user.orcid}" class="orcid">${user.orcid}</a></dd>
          </div>

          <div>
            <dt>PREreview pseudonym</dt>
            <dd>${user.pseudonym}</dd>
          </div>
        </dl>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
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
