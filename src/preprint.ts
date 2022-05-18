import { flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import textClipper from 'text-clipper'
import { Record, getRecord } from 'zenodo-ts'
import { page } from './page'

const sendPage = flow(
  (record: Record) => M.of(record),
  M.ichainFirst(() => M.status(Status.OK)),
  M.ichainFirst(() => M.contentType(MediaType.textHTML)),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichainW(flow(createPage, M.send)),
)

export const preprint = pipe(
  RM.fromReaderTaskEither(getRecord(1061864)),
  RM.ichainMiddlewareKW(sendPage),
  RM.orElseMiddlewareK(() => showFailureMessage),
)

const showFailureMessage = pipe(
  M.status(Status.ServiceUnavailable),
  M.ichainFirst(() => M.contentType(MediaType.textHTML)),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichain(() => pipe(failureMessage(), M.send)),
)

function failureMessage() {
  return page({
    title: 'Sorry, we’re having problems',
    content: `
  <main>
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to show the preprint and its reviews now.</p>

    <p>Please try again later.</p>
  </main>
`,
  })
}

function createPage(review: Record) {
  return page({
    title: "Reviews of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: `

  <article>
    <h1>The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i></h1>
  </article>

  <main>
    <h2>1 PREreview</h2>

    <a href="doi-10.1101-2022.01.13.476201/review" class="button">Write a PREreview</a>

    <ol class="cards">
      <li>
        <article>
          <ol aria-label="Authors of this review" role="list" class="author-list">
            ${review.metadata.creators.map(author => `<li>${author.name}</li>`).join('\n')}
          </ol>
          ${textClipper(review.metadata.description, 300, { html: true, maxLines: 5 })}
          <a href="../reviews/1061864" class="more">
            Read <span class="visually-hidden">the review by ${review.metadata.creators[0].name} et al.</span>
          </a>
        </article>
      </li>
    </ol>
  </main>
`,
  })
}
