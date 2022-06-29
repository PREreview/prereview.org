import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { Orcid } from 'orcid-id-ts'
import textClipper from 'text-clipper'
import { Record, Records, getRecords } from 'zenodo-ts'
import { Html, html, plainText, rawHtml, sendHtml } from './html'
import { handleError } from './http-error'
import { page } from './page'
import { reviewMatch, writeReviewMatch } from './routes'

export type Preprint = {
  abstract: Html
  authors: ReadonlyNonEmptyArray<{
    name: string
    orcid?: Orcid
  }>
  doi: Doi
  posted: Date
  title: Html
  url: URL
}

export interface GetPreprintEnv {
  getPreprint: (doi: Doi) => TE.TaskEither<unknown, Preprint>
}

const sendPage = flow(
  createPage,
  M.of,
  M.ichainFirst(() => M.status(Status.OK)),
  M.ichain(sendHtml),
)

const getPreprint = (doi: Doi) =>
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
            }),
          RM.fromReaderTaskEitherK(getRecords),
        ),
      ),
      RM.ichainMiddlewareKW(sendPage),
      RM.orElseMiddlewareK(() => showFailureMessage),
    ),
  ),
  RM.orElseMiddlewareK(() => handleError(new NotFound())),
)

const showFailureMessage = pipe(
  M.status(Status.ServiceUnavailable),
  M.ichain(() => pipe(failureMessage(), sendHtml)),
)

function failureMessage() {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the preprint and its reviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function createPage({ preprint, reviews }: { preprint: Preprint; reviews: Records }) {
  return page({
    title: plainText`Reviews of '${preprint.title}'`,
    content: html`
      <h1 class="visually-hidden">Reviews of '${preprint.title}'</h1>

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
                <dd>
                  <time datetime="${preprint.posted.toISOString().slice(0, 10)}">
                    ${preprint.posted.toLocaleDateString('en', { dateStyle: 'long' })}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Server</dt>
                <dd>bioRxiv</dd>
              </div>
              <div>
                <dt>DOI</dt>
                <dd class="doi">${preprint.doi}</dd>
              </div>
            </dl>
          </header>

          <h3 class="visually-hidden">Abstract</h3>

          ${preprint.abstract}

          <a href="${preprint.url.href}" class="button">Read the preprint</a>
        </article>
      </aside>

      <main>
        <h2>${reviews.hits.hits.length} PREreview${reviews.hits.hits.length !== 1 ? 's' : ''}</h2>

        <a href="${format(writeReviewMatch.formatter, {})}" class="button">Write a PREreview</a>

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
        <ol aria-label="Authors of this review" role="list" class="author-list">
          ${review.metadata.creators.map(author => html` <li>${author.name}</li>`)}
        </ol>

        ${rawHtml(textClipper(review.metadata.description, 300, { html: true, maxLines: 5 }))}

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          Read
          <span class="visually-hidden">
            the review by ${review.metadata.creators[0].name} ${review.metadata.creators.length > 1 ? 'et al.' : ''}
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
