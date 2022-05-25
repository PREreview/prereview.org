import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import { getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import markdownIt from 'markdown-it'
import { match } from 'ts-pattern'
import { DepositMetadata, createDeposition, publishDeposition, uploadFile } from 'zenodo-ts'
import { page } from './page'
import { logInMatch, preprintMatch, writeReviewMatch } from './routes'
import { NonEmptyStringC } from './string'
import { User, UserC } from './user'

const NewReviewD = D.struct({
  review: NonEmptyStringC,
})

type NewReview = D.TypeOf<typeof NewReviewD>

export const writeReview = pipe(
  RM.decodeMethod(E.right),
  RM.ichainW(method =>
    match(method)
      .with('POST', () => handleForm)
      .otherwise(() => showForm),
  ),
)

function createDepositMetadata(review: NewReview, user: User): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: 'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
    creators: [user],
    description: markdownIt().render(review.review),
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

const handleNewReview = (review: NewReview) =>
  pipe(
    getSession(),
    RM.chainEitherKW(UserC.decode),
    RM.chainReaderTaskEitherKW(createRecord(review)),
    RM.ichainMiddlewareKW(deposition => showSuccessMessage(deposition.metadata.doi)),
    RM.orElseMiddlewareK(() => showFailureMessage),
  )

const handleForm = pipe(
  RM.decodeBody(NewReviewD.decode),
  RM.ichainW(handleNewReview),
  RM.orElseMiddlewareK(() =>
    pipe(
      M.status(Status.SeeOther),
      M.ichain(() => M.header('Location', format(writeReviewMatch.formatter, {}))),
      M.ichain(() => M.closeHeaders()),
      M.ichain(() => M.end()),
    ),
  ),
)

function createRecord(review: NewReview) {
  return (user: User) =>
    pipe(
      createDepositMetadata(review, user),
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
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainW(flow(form, RM.send)),
  RM.orElseMiddlewareK(() => redirectToLogInPage),
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

const redirectToLogInPage = pipe(
  M.redirect(format(logInMatch.formatter, {})),
  M.ichainFirst(() => M.closeHeaders()),
  M.ichainFirst(() => M.end()),
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

    <a href="${format(preprintMatch.formatter, {})}" class="button">Back to preprint</a>
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

    <a href="${format(preprintMatch.formatter, {})}" class="button">Back to preprint</a>
  </main>
`,
  })
}

function form(user: User) {
  return page({
    title: "Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: `
  <main>
    <h1>
      Write a PREreview of “The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>”
    </h1>

    <form method="post">
      <label>
        Name
        <input type="text" value="${user.name}" readonly>
      </label>

      <label class="textarea">
        Text
        <textarea id="review" name="review" rows="20"></textarea>
      </label>

      <button>Post PREreview</button>
    </form>
  </main>
`,
  })
}
