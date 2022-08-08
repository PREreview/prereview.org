import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { Orcid } from 'orcid-id-ts'
import textClipper from 'text-clipper'
import { Record, Records, getRecords } from 'zenodo-ts'
import { Html, html, plainText, rawHtml, sanitizeHtml, sendHtml } from './html'
import { notFound } from './middleware'
import { page } from './page'
import { reviewMatch, writeReviewMatch } from './routes'
import { renderDate } from './time'

import PlainDate = Temporal.PlainDate

export type Preprint = {
  abstract: Html
  authors: ReadonlyNonEmptyArray<{
    name: string
    orcid?: Orcid
  }>
  doi: Doi<'1101'>
  posted: PlainDate
  server: 'bioRxiv' | 'medRxiv'
  title: Html
  url: URL
}

export interface GetPreprintEnv {
  getPreprint: (doi: Doi<'1101'>) => TE.TaskEither<unknown, Preprint>
}

const sendPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const getPreprint = (doi: Doi<'1101'>) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }: GetPreprintEnv) => getPreprint(doi)))

export const preprint = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.bindTo('preprint'),
  RM.ichainW(
    flow(
      RM.of,
      RM.bindW(
        'reviews',
        flow(
          ({ preprint }) =>
            new URLSearchParams({
              communities: 'prereview-reviews',
              q: `related.identifier:"${preprint.doi}"`,
              size: '100',
              sort: 'mostrecent',
            }),
          RM.fromReaderTaskEitherK(getRecords),
        ),
      ),
      RM.ichainW(sendPage),
      RM.orElseW(() => showFailureMessage),
    ),
  ),
  RM.orElseW(() => notFound),
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

        <p>We’re unable to show the preprint and its PREreviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function createPage({ preprint, reviews }: { preprint: Preprint; reviews: Records }) {
  return page({
    title: plainText`PREreviews of “${preprint.title}”`,
    content: html`
      <h1 class="visually-hidden">PREreviews of “${preprint.title}”</h1>

      <aside tabindex="0" aria-label="Preprint details">
        <article>
          <header>
            <h2>${preprint.title}</h2>

            <ol aria-label="Authors of this preprint" role="list" class="author-list">
              ${preprint.authors.map(author => html` <li>${displayAuthor(author)}</li>`)}
            </ol>

            <dl>
              <div>
                <dt>Posted</dt>
                <dd>${renderDate(preprint.posted)}</dd>
              </div>
              <div>
                <dt>Server</dt>
                <dd>${preprint.server}</dd>
              </div>
              <div>
                <dt>DOI</dt>
                <dd class="doi">${preprint.doi}</dd>
              </div>
            </dl>
          </header>

          <h3>Abstract</h3>

          ${preprint.abstract}

          <a href="${preprint.url.href}" class="button">Read the preprint</a>
        </article>
      </aside>

      <main>
        <h2>${reviews.hits.hits.length} PREreview${reviews.hits.hits.length !== 1 ? 's' : ''}</h2>

        <a href="${format(writeReviewMatch.formatter, { doi: preprint.doi })}" class="button">Write a PREreview</a>

        <ol class="cards">
          ${reviews.hits.hits.map(showReview)}
        </ol>
      </main>
    `,
    type: 'two-up',
  })
}

function showReview(review: Record) {
  return html`
    <li>
      <article>
        <ol aria-label="Authors of this PREreview" role="list" class="author-list">
          ${review.metadata.creators.map(author => html` <li>${author.name}</li>`)}
        </ol>

        ${rawHtml(textClipper(sanitizeHtml(review.metadata.description).toString(), 300, { html: true, maxLines: 5 }))}

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          Read
          <span class="visually-hidden">
            the PREreview by ${review.metadata.creators[0].name} ${review.metadata.creators.length > 1 ? 'et al.' : ''}
          </span>
        </a>
      </article>
    </li>
  `
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
