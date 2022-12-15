import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { notFound, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { preprintMatch, writeReviewStartMatch } from '../routes'
import { User, getUserFromSession } from '../user'
import { getForm, redirectToNextForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getUserFromSession(),
      RM.bindTo('user'),
      RM.bindW(
        'form',
        RM.fromReaderTaskK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.ichainW(state =>
        match(state)
          .with({ form: { right: P.select() } }, fromMiddlewareK(redirectToNextForm(preprint.doi)))
          .with({ form: P.when(E.isLeft) }, ({ user }) => showStartPage(preprint, user))
          .exhaustive(),
      ),
      RM.orElseW(() => showStartPage(preprint)),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showStartPage = flow(
  fromReaderK(startPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

function startPage(preprint: Preprint, user?: User) {
  return page({
    title: plainText`PREreview this preprint`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main id="main-content">
        <h1>PREreview this preprint</h1>

        <p>
          You can write a PREreview of “<span lang="${preprint.language}" dir="${getLangDir(preprint.language)}"
            >${preprint.title}</span
          >”. A PREreview is a free-text review of a preprint and can vary from a few sentences to a lengthy report,
          similar to a journal-organized peer-review report.
        </p>

        ${user
          ? ''
          : html`
              <h2>Before you start</h2>

              <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

              <details>
                <summary>What is an ORCID&nbsp;iD?</summary>

                <div>
                  <p>
                    An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a persistent digital identifier you
                    own and control, distinguishing you from every other researcher.
                  </p>
                </div>
              </details>
            `}

        <a href="${format(writeReviewStartMatch.formatter, { doi: preprint.doi })}" role="button" draggable="false">
          Start now
        </a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
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
