import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { Predicate } from 'fp-ts/Predicate'
import { flow, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { Record, getRecord } from 'zenodo-ts'
import { handleError } from './http-error'
import { page } from './page'

const isInCommunity: Predicate<Record> = flow(
  O.fromNullableK(record => record.metadata.communities),
  O.chain(A.findFirst(community => community.id === 'prereview-reviews')),
  O.isSome,
)

const sendPage = flow(
  (record: Record) => M.of(record),
  M.filterOrElse(isInCommunity, () => new NotFound()),
  M.ichainFirst(() => M.status(Status.OK)),
  M.ichainFirst(() => M.contentType(MediaType.textHTML)),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichainW(flow(createPage, M.send)),
  M.orElseW(handleError),
)

export const review = flow(
  RM.fromReaderTaskEitherK(getRecord),
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
    <a href="../preprints/doi-10.1101-2022.01.13.476201" class="back">Back to preprint</a>
  </nav>

  <main>
    <h1>Review of 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'</h1>

    <ol aria-label="Authors of this review" class="author-list">
      ${review.metadata.creators.map(author => `<li>${author.name}</li>`).join('\n')}
    </ol>

    ${review.metadata.description}
  </main>
`,
  })
}
