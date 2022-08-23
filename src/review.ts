import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { Html, html, plainText, sendHtml } from './html'
import { notFound } from './middleware'
import { page } from './page'
import { preprintMatch } from './routes'
import { renderDate } from './time'

import PlainDate = Temporal.PlainDate

export type Prereview = {
  authors: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
  doi: Doi
  postedDate: PlainDate
  preprint: {
    doi: Doi<'1101'>
    language: 'en'
    title: Html
  }
  text: Html
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<unknown, Prereview>
}

const getPrereview = (id: number) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }: GetPrereviewEnv) => getPrereview(id)))

const sendPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

export const review = flow(
  RM.fromReaderTaskEitherK(getPrereview),
  RM.ichainW(sendPage),
  RM.orElseW(error =>
    match(error)
      .with({ status: Status.NotFound }, () => notFound)
      .otherwise(() => showFailureMessage),
  ),
)

const showFailureMessage = pipe(
  RM.rightReader(failureMessage()),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

function failureMessage() {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the PREreview now.</p>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function createPage(review: Prereview) {
  return page({
    title: plainText`PREreview of “${review.preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: review.preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main>
        <header>
          <h1>PREreview of “${review.preprint.title}”</h1>

          <ol aria-label="Authors of this PREreview" class="author-list">
            ${review.authors.map(author => html`<li>${displayAuthor(author)}</li>`)}
          </ol>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>${renderDate(review.postedDate)}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi">${review.doi}</dd>
            </div>
          </dl>
        </header>

        ${review.text}
      </main>
    `,
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="https://orcid.org/${orcid}">${name}</a>`
  }

  return name
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
