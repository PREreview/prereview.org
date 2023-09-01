import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import { flow, identity, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { type CareerStage, getCareerStage } from './career-stage'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { getResearchInterests } from './research-interests'
import { changeCareerStageMatch, changeResearchInterestsMatch, myDetailsMatch } from './routes'
import type { NonEmptyString } from './string'
import { type GetUserEnv, type User, getUser } from './user'

export const myDetails = pipe(
  getUser,
  RM.bindTo('user'),
  RM.bindW(
    'careerStage',
    flow(
      RM.fromReaderTaskEitherK(({ user: { orcid } }) => getCareerStage(orcid)),
      RM.map(O.some),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => RM.of(O.none))
          .otherwise(RM.left),
      ),
    ),
  ),
  RM.bindW(
    'researchInterests',
    flow(
      RM.fromReaderTaskEitherK(({ user: { orcid } }) => getResearchInterests(orcid)),
      RM.map(O.some),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => RM.of(O.none))
          .otherwise(RM.left),
      ),
    ),
  ),
  chainReaderKW(({ user, careerStage, researchInterests }) => createPage(user, careerStage, researchInterests)),
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
      .with('unavailable', () => serviceUnavailable)
      .with(P.instanceOf(Error), () => serviceUnavailable)
      .exhaustive(),
  ),
)

function createPage(user: User, careerStage: O.Option<CareerStage>, researchInterests: O.Option<NonEmptyString>) {
  return page({
    title: plainText`My details`,
    content: html`
      <main id="main-content">
        <h1>My details</h1>

        <dl class="summary-list">
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

          <div>
            <dt>Career stage</dt>
            <dd>
              ${match(careerStage)
                .with({ value: 'early' }, () => 'Early')
                .with({ value: 'mid' }, () => 'Mid')
                .with({ value: 'late' }, () => 'Late')
                .when(O.isNone, () => 'Unknown')
                .exhaustive()}
            </dd>
            <dd>
              <a href="${format(changeCareerStageMatch.formatter, {})}"
                >Change <span class="visually-hidden">career stage</span></a
              >
            </dd>
          </div>

          <div>
            <dt>Research interests</dt>
            <dd>
              ${match(researchInterests)
                .with({ value: P.select() }, identity)
                .when(O.isNone, () => 'Unknown')
                .exhaustive()}
            </dd>
            <dd>
              <a href="${format(changeResearchInterestsMatch.formatter, {})}"
                >Change <span class="visually-hidden">research interests</span></a
              >
            </dd>
          </div>
        </dl>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    current: 'my-details',
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
