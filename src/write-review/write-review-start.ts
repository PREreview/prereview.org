import { format } from 'fp-ts-routing'
import { Option } from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import { Lazy, flow, pipe } from 'fp-ts/function'
import { ResponseEnded, Status, StatusOpen } from 'hyper-ts'
import { OAuthEnv } from 'hyper-ts-oauth'
import { getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { PublicUrlEnv, logInAndRedirect } from '../log-in'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { FathomEnv, PhaseEnv, page } from '../page'
import { preprintMatch, writeReviewAlreadyWrittenMatch, writeReviewStartMatch } from '../routes'
import { getUserFromSession } from '../user'
import { Form, getForm, nextFormMatch } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewStart = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getSession(),
      chainOptionKW(() => 'no-session' as const)(getUserFromSession),
      RM.chainReaderTaskEitherKW(user => getForm(user.orcid, preprint.doi)),
      RM.ichainW(form => showCarryOnPage(preprint, form)),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            fromMiddlewareK<FathomEnv & PhaseEnv & PublicUrlEnv & OAuthEnv, [], void, StatusOpen, ResponseEnded, never>(
              () => seeOther(format(writeReviewAlreadyWrittenMatch.formatter, { doi: preprint.doi })),
            ),
          )
          .with('no-session', () => logInAndRedirect(writeReviewStartMatch.formatter, { doi: preprint.doi }))
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

function carryOnPage(preprint: Preprint, form: Form) {
  return page({
    title: plainText`Write a PREreview`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main id="main-content">
        <h1>Write a PREreview</h1>

        <p>
          As you’ve already started a PREreview of “<span
            lang="${preprint.language}"
            dir="${getLangDir(preprint.language)}"
            >${preprint.title}</span
          >”, we’ll take you to the next step so you can carry&nbsp;on.
        </p>

        <a href="${format(nextFormMatch(form).formatter, { doi: preprint.doi })}" role="button" draggable="false"
          >Continue</a
        >
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/80
function chainOptionKW<E2>(
  onNone: Lazy<E2>,
): <A, B>(
  f: (a: A) => Option<B>,
) => <R, I, E1>(ma: RM.ReaderMiddleware<R, I, I, E1, A>) => RM.ReaderMiddleware<R, I, I, E1 | E2, B> {
  return f => RM.ichainMiddlewareKW((...a) => M.fromOption(onNone)(f(...a)))
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
