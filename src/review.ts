import { pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { Record, getRecord } from 'zenodo-ts'
import { page } from './page'

const sendPage = (review: Record) =>
  pipe(
    M.status(Status.OK),
    M.ichainFirst(() => M.contentType(MediaType.textHTML)),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => pipe(createPage(review), M.send)),
  )

export const review = pipe(
  RM.right(1061864),
  RM.chainReaderTaskEitherK(getRecord),
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

    <p>We’re unable to show the PREreview now.</p>

    <p>Please try again later.</p>

    <a href="../doi-10.1101-2022.01.13.476201" class="button">Back to preprint</a>
  </main>
`,
  })
}

function createPage(review: Record) {
  return page({
    title:
      "Review of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' by Jingfang Hao et al.",
    content: `
  <nav>
    <a href="../preprints/doi-10.1101-2022.01.13.476201.html" class="back">Back to preprint</a>
  </nav>

  <main>
    <h1>Review of 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'</h1>

    <ol aria-label="Authors of this review" class="author-list">
      <li>Alizée Malnoë</li>
      <li>Jack Forsman</li>
      <li>Jianli Duan</li>
      <li>Jingfang Hao</li>
      <li>Maria Paola Puggioni</li>
      <li>Pierrick Bru</li>
      <li>Pushan bag</li>
    </ol>

    ${review.metadata.description}
  </main>
`,
  })
}
