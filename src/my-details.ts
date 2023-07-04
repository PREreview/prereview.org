import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as R from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { canEditProfile } from './feature-flags'
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
  chainReaderKW(user => createPage(user, O.none as O.None)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(error =>
    match(error)
      .returnType<
        RM.ReaderMiddleware<
          GetUserEnv & FathomEnv & PhaseEnv & PublicUrlEnv & OAuthEnv,
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

function createPage(user: User, careerStage: O.None) {
  return pipe(
    canEditProfile,
    R.chainW(canEditProfile =>
      page({
        title: plainText`My details`,
        content: html`
          <main id="main-content">
            <h1>My details</h1>

            <dl>
              <div>
                <dt>Name</dt>
                <dd>${user.name}</dd>
              </div>

              <div>
                <dt>ORCID iD</dt>
                <dd><a href="https://orcid.org/${user.orcid}" class="orcid">${user.orcid}</a></dd>
              </div>

              <div>
                <dt>PREreview pseudonym</dt>
                <dd>${user.pseudonym}</dd>
              </div>

              ${canEditProfile
                ? html`<div>
                    <dt>Career stage</dt>
                    <dd>
                      ${match(careerStage)
                        .when(O.isNone, () => 'Unknown')
                        .exhaustive()}
                    </dd>
                  </div>`
                : ''}
            </dl>
          </main>
        `,
        skipLinks: [[html`Skip to main content`, '#main-content']],
        current: 'my-details',
        user,
      }),
    ),
  )
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
