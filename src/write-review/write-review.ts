import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { notFound, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { logInMatch, preprintMatch } from '../routes'
import { getUserFromSession } from '../user'
import { getForm, showNextForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getUserFromSession(),
      RM.chainReaderTaskKW(user => getForm(user.orcid, preprint.doi)),
      RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
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

function startPage(preprint: Preprint) {
  return page({
    title: plainText`PREreview this preprint`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main>
        <h1>PREreview this preprint</h1>

        <p>
          You can write a PREreview of “<span lang="${preprint.language}" dir="${getLangDir(preprint.language)}"
            >${preprint.title}</span
          >”. A PREreview is a free-text review of a preprint and can vary from a few sentences to a lengthy report,
          similar to a journal-organized peer-review report.
        </p>

        <h2>Before you start</h2>

        <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

        <details>
          <summary>What is an ORCID&nbsp;iD?</summary>

          <div>
            <p>
              An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a persistent digital identifier you own
              and control, distinguishing you from every other researcher.
            </p>
          </div>
        </details>

        <a href="${format(logInMatch.formatter, {})}" role="button" draggable="false">Start now</a>
      </main>
    `,
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
