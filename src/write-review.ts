import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { endSession, getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import markdownIt from 'markdown-it'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { DepositMetadata, createDeposition, publishDeposition, uploadFile } from 'zenodo-ts'
import { html, rawHtml, sendHtml } from './html'
import { page } from './page'
import { logInMatch, preprintMatch, writeReviewMatch } from './routes'
import { NonEmptyStringC } from './string'
import { User, UserC } from './user'

const ReviewFormD = D.struct({
  review: NonEmptyStringC,
})

const PersonaFormD = D.struct({
  persona: D.literal('public', 'anonymous'),
  review: NonEmptyStringC,
})

const PostFormD = D.struct({
  persona: D.literal('public', 'anonymous'),
  review: NonEmptyStringC,
})

const ActionD = pipe(
  D.struct({
    action: D.literal('review', 'persona', 'post'),
  }),
  D.map(get('action')),
)

type ReviewForm = D.TypeOf<typeof ReviewFormD>
type PersonaForm = D.TypeOf<typeof PersonaFormD>
type PostForm = D.TypeOf<typeof PostFormD>

export const writeReview = pipe(
  RM.decodeMethod(E.right),
  RM.ichainW(method =>
    match(method)
      .with('POST', () => handleForm)
      .otherwise(() => showReviewForm),
  ),
)

function createDepositMetadata(review: PostForm, user: User): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: 'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
    creators: [review.persona === 'public' ? user : { name: 'PREreviewer' }],
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

const handlePostForm = (user: User) =>
  pipe(
    RM.decodeBody(PostFormD.decode),
    RM.chainReaderTaskEitherK(createRecord(user)),
    RM.ichainW(deposition => showSuccessMessage(deposition.metadata.doi)),
    RM.orElseW(() => showFailureMessage),
  )

const showPersonaForm = (review: ReviewForm) =>
  pipe(
    getSession(),
    RM.chainEitherKW(UserC.decode),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareKW(flow(user => personaForm(review, user), sendHtml)),
    RM.orElseMiddlewareK(() => showStartPage),
  )

const handleReviewForm = pipe(
  RM.decodeBody(ReviewFormD.decode),
  RM.ichainW(showPersonaForm),
  RM.orElseMiddlewareK(() =>
    pipe(
      M.status(Status.SeeOther),
      M.ichain(() => M.header('Location', format(writeReviewMatch.formatter, {}))),
      M.ichain(() => M.closeHeaders()),
      M.ichain(() => M.end()),
    ),
  ),
)

const showPostForm = (review: PersonaForm) =>
  pipe(
    getSession(),
    RM.chainEitherKW(UserC.decode),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareKW(user => pipe(postForm(review, user), sendHtml)),
    RM.orElseMiddlewareK(() => showStartPage),
  )

const handlePersonaForm = pipe(
  RM.decodeBody(PersonaFormD.decode),
  RM.ichainW(showPostForm),
  RM.orElseW(() => handleReviewForm),
)

const handleForm = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.bindTo('user'),
  RM.apSW('action', RM.decodeBody(ActionD.decode)),
  RM.ichainW(({ action, user }) =>
    match(action)
      .with('review', () => handleReviewForm)
      .with('persona', () => handlePersonaForm)
      .with('post', () => handlePostForm(user))
      .exhaustive(),
  ),
  RM.orElseMiddlewareK(() =>
    pipe(
      M.status(Status.SeeOther),
      M.ichain(() => M.header('Location', format(writeReviewMatch.formatter, {}))),
      M.ichain(() => M.closeHeaders()),
      M.ichain(() => M.end()),
    ),
  ),
)

function createRecord(user: User) {
  return (review: PostForm) =>
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

const showReviewForm = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(flow(reviewForm, sendHtml)),
  RM.orElseMiddlewareK(() => showStartPage),
)

const showSuccessMessage = (doi: Doi) =>
  pipe(
    RM.status(Status.OK),
    RM.ichainFirst(() => endSession()),
    RM.ichainMiddlewareK(() => pipe(successMessage(doi), sendHtml)),
  )

const showFailureMessage = pipe(
  RM.status(Status.ServiceUnavailable),
  RM.ichainFirst(() => endSession()),
  RM.ichainMiddlewareK(() => pipe(failureMessage(), sendHtml)),
)

const showStartPage = pipe(
  M.status(Status.OK),
  M.ichain(() => pipe(startPage(), sendHtml)),
)

function successMessage(doi: Doi) {
  return page({
    title: 'PREreview posted',
    content: html`
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
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to post your PREreview now.</p>

        <p>Please try again later.</p>

        <a href="${format(preprintMatch.formatter, {})}" class="button">Back to preprint</a>
      </main>
    `,
  })
}

function postForm(review: PersonaForm, user: User) {
  return page({
    title: "Preview your PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <h1 id="preview-label">Preview</h1>

        <blockquote class="preview" tabindex="0" aria-labelledby="preview-label">
          <h2>Review of 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'</h2>

          <ol aria-label="Authors of this review" class="author-list">
            <li>${displayAuthor(review.persona === 'public' ? user : { name: 'PREreviewer' })}</li>
          </ol>

          ${rawHtml(markdownIt().render(review.review))}
        </blockquote>

        <form method="post">
          <input name="persona" type="hidden" value="${review.persona}" />

          <textarea name="review" hidden>${review.review}</textarea>

          <button name="action" value="post">Post PREreview</button>
        </form>
      </main>
    `,
  })
}

function personaForm(review: ReviewForm, user: User) {
  return page({
    title: "Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <form method="post">
          <fieldset role="group" aria-describedby="persona-tip">
            <legend>
              <h1>Publish as</h1>
            </legend>

            <div id="persona-tip" role="note">What name would you like to appear on your PREreview?</div>

            <ol>
              <li>
                <label>
                  <input name="persona" type="radio" value="public" aria-describedby="persona-tip-public" />
                  ${user.name}
                </label>
                <div id="persona-tip-public" role="note">We’ll link your PREreview to your ORCID iD.</div>
              </li>
              <li>
                <label>
                  <input name="persona" type="radio" value="anonymous" aria-describedby="persona-tip-pseudonym" />
                  PREreviewer
                </label>
                <div id="persona-tip-pseudonym" role="note">Your PREreview will be anonymous.</div>
              </li>
            </ol>
          </fieldset>

          <textarea name="review" hidden>${review.review}</textarea>

          <button name="action" value="persona">Next</button>
        </form>
      </main>
    `,
  })
}

function reviewForm() {
  return page({
    title: "Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <form method="post">
          <h1>
            <label for="review">
              Write a PREreview of “The role of LHCBM1 in non-photochemical quenching in
              <i>Chlamydomonas reinhardtii</i>”
            </label>
          </h1>

          <textarea id="review" name="review" rows="20"></textarea>

          <button name="action" value="review">Next</button>
        </form>
      </main>
    `,
  })
}

function startPage() {
  return page({
    title: "Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <h1>
          Write a PREreview of “The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>”
        </h1>

        <p>
          We will ask you to log in with your <a href="https://orcid.org/">ORCID&nbsp;iD</a>. If you don't have an iD,
          you can create one.
        </p>

        <a href="${format(logInMatch.formatter, {})}" role="button" draggable="false">Start now</a>
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
