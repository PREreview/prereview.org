import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import textClipper from 'text-clipper'
import { Record, Records, getRecords } from 'zenodo-ts'
import { html, rawHtml, sendHtml } from './html'
import { page } from './page'
import { reviewMatch, writeReviewMatch } from './routes'

const sendPage = flow(
  (records: Records) => M.of(records),
  M.ichainFirst(() => M.status(Status.OK)),
  M.ichainW(flow(createPage, sendHtml)),
)

export const preprint = pipe(
  new URLSearchParams({
    communities: 'prereview-reviews',
    q: 'related.identifier:"10.1101/2022.01.13.476201"',
    size: '100',
  }),
  RM.fromReaderTaskEitherK(getRecords),
  RM.ichainMiddlewareKW(sendPage),
  RM.orElseMiddlewareK(() => showFailureMessage),
)

const showFailureMessage = pipe(
  M.status(Status.ServiceUnavailable),
  M.ichain(() => pipe(failureMessage(), sendHtml)),
)

function failureMessage() {
  return page({
    title: 'Sorry, we’re having problems',
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the preprint and its reviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function createPage(reviews: Records) {
  return page({
    title: "Reviews of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <article>
        <h1>The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i></h1>
      </article>

      <main>
        <h2>${reviews.hits.hits.length} PREreview${reviews.hits.hits.length !== 1 ? 's' : ''}</h2>

        <a href="${format(writeReviewMatch.formatter, {})}" class="button">Write a PREreview</a>

        <ol class="cards">
          ${reviews.hits.hits.map(showReview)}
        </ol>
      </main>
    `,
  })
}

function showReview(review: Record) {
  return html`
    <li>
      <article>
        <ol aria-label="Authors of this review" role="list" class="author-list">
          ${review.metadata.creators.map(author => html`<li>${author.name}</li>`)}
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
