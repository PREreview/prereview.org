import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { logInAndRedirect } from '../log-in'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import type { PublicUrlEnv } from '../public-url'
import { preprintReviewsMatch, writeReviewAlreadyWrittenMatch, writeReviewStartMatch } from '../routes'
import { type GetUserEnv, type User, getUser } from '../user'
import { type Form, getForm, nextFormMatch } from './form'

export const writeReviewStart = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      getUser,
      RM.bindTo('user'),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.ichainW(({ form, user }) => showCarryOnPage(preprint, form, user)),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            fromMiddlewareK<
              GetUserEnv & FathomEnv & PhaseEnv & PublicUrlEnv & OAuthEnv,
              [],
              void,
              StatusOpen,
              ResponseEnded,
              never
            >(() => seeOther(format(writeReviewAlreadyWrittenMatch.formatter, { id: preprint.id }))),
          )
          .with('no-session', () => logInAndRedirect(writeReviewStartMatch.formatter, { id: preprint.id }))
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showCarryOnPage = flow(
  fromReaderK(carryOnPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

function carryOnPage(preprint: PreprintTitle, form: Form, user: User) {
  return page({
    title: plainText`Write a PREreview`,
    content: html`
      <nav>
        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
      </nav>

      <main id="main-content">
        <h1>Write a PREreview</h1>

        <p>
          As you’ve already started a PREreview of
          <cite lang="${preprint.language}" dir="${getLangDir(preprint.language)}">${preprint.title}</cite>, we’ll take
          you to the next step so you can carry&nbsp;on.
        </p>

        <a href="${format(nextFormMatch(form).formatter, { id: preprint.id })}" role="button" draggable="false"
          >Continue</a
        >
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    type: 'streamline',
    user,
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
