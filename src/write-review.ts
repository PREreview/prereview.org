import { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { DepositMetadata, createDeposition, publishDeposition, uploadFile } from 'zenodo-ts'
import { page } from './page'
import { NonEmptyStringC } from './string'

const NewReviewD = D.struct({
  review: NonEmptyStringC,
})

type NewReview = D.TypeOf<typeof NewReviewD>

export const writeReview = pipe(
  RM.decodeMethod(E.right),
  RM.ichainW(method =>
    match(method)
      .with('POST', () => handleForm)
      .otherwise(() => RM.fromMiddleware(showForm)),
  ),
)

function createDepositMetadata(review: NewReview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: 'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
    creators: [{ name: 'PREreviewer' }],
    description: review.review,
    communities: [{ identifier: 'prereview-reviews' }],
    related_identifiers: [
      {
        scheme: 'doi',
        identifier: '10.1101/2022.01.13.476201',
        relation: 'reviews',
        resource_type: 'publication-preprint',
      },
    ],
  }
}

const handleNewReview = flow(
  RM.fromReaderTaskEitherK(createRecord),
  RM.ichainMiddlewareKW(deposition => showSuccessMessage(deposition.metadata.doi)),
  RM.orElseMiddlewareK(() => showFailureMessage),
)

const handleForm = pipe(
  RM.decodeBody(NewReviewD.decode),
  RM.ichainW(handleNewReview),
  RM.orElseMiddlewareK(() =>
    pipe(
      M.status(Status.SeeOther),
      M.ichain(() => M.header('Location', '/preprints/doi-10.1101-2022.01.13.476201/review')),
      M.ichain(() => M.closeHeaders()),
      M.ichain(() => M.end()),
    ),
  ),
)

function createRecord(review: NewReview) {
  return pipe(
    createDepositMetadata(review),
    createDeposition,
    RTE.chainFirst(
      uploadFile({
        name: 'review.txt',
        type: 'text/plain',
        content: review.review,
      }),
    ),
    RTE.chain(publishDeposition),
  )
}

const showForm = pipe(
  M.status(Status.OK),
  M.ichainFirst(() => M.contentType(MediaType.textHTML)),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichain(flow(form, M.send)),
)

const showSuccessMessage = (doi: Doi) =>
  pipe(
    M.status(Status.OK),
    M.ichainFirst(() => M.contentType(MediaType.textHTML)),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => pipe(successMessage(doi), M.send)),
  )

const showFailureMessage = pipe(
  M.status(Status.ServiceUnavailable),
  M.ichainFirst(() => M.contentType(MediaType.textHTML)),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichain(() => pipe(failureMessage(), M.send)),
)

function successMessage(doi: Doi) {
  return page({
    title: 'PREreview posted',
    content: `
  <main>
    <div class="panel">
      <h1>PREreview posted</h1>

      <p>
        Your DOI <br />
        <strong class="doi">${doi}</strong>
      </p>
    </div>

    <h2>What happens next</h2>

    <p>You’ll be able to see your PREreview shortly.</p>

    <a href="../doi-10.1101-2022.01.13.476201" class="button">Back to preprint</a>
  </main>
`,
  })
}

function failureMessage() {
  return page({
    title: 'Sorry, we’re having problems',
    content: `
  <main>
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to post your PREreview now.</p>

    <p>Please try again later.</p>

    <a href="../doi-10.1101-2022.01.13.476201" class="button">Back to preprint</a>
  </main>
`,
  })
}

function form() {
  return page({
    title: "Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: `
  <main>
    <h1>
      <label for="review">
        Write a PREreview of “The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>”
      </label>
    </h1>

    <form method="post">
      <textarea id="review" name="review" rows="20"></textarea>

      <button>Post PREreview</button>
    </form>
  </main>
`,
  })
}
