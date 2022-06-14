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

const CodeOfConductFormD = D.struct({
  conduct: D.literal('yes'),
  persona: D.literal('public', 'anonymous'),
  review: NonEmptyStringC,
})

const PostFormD = D.struct({
  conduct: D.literal('yes'),
  persona: D.literal('public', 'anonymous'),
  review: NonEmptyStringC,
})

const ActionD = pipe(
  D.struct({
    action: D.literal('review', 'persona', 'conduct', 'post'),
  }),
  D.map(get('action')),
)

type ReviewForm = D.TypeOf<typeof ReviewFormD>
type PersonaForm = D.TypeOf<typeof PersonaFormD>
type CodeOfConductForm = D.TypeOf<typeof CodeOfConductFormD>
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

const showPersonaForm = (user: User) => (review: ReviewForm) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(personaForm(review, user), sendHtml)),
  )

const showPersonaErrorForm = (user: User) => (review: ReviewForm) =>
  pipe(
    M.status(Status.BadRequest),
    M.ichain(() => pipe(personaErrorForm(review, user), sendHtml)),
    M.orElse(() => showStartPage),
  )

const showCodeOfConductForm = (review: PersonaForm) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(codeOfConductForm(review), sendHtml)),
  )

const showCodeOfConductErrorForm = (review: PersonaForm) =>
  pipe(
    M.status(Status.BadRequest),
    M.ichain(() => pipe(codeOfConductErrorForm(review), sendHtml)),
  )

const handleReviewForm = (user: User) =>
  pipe(
    M.decodeBody(ReviewFormD.decode),
    M.ichainW(showPersonaForm(user)),
    M.orElse(() => showReviewErrorForm),
  )

const showPostForm = (user: User) => (review: CodeOfConductForm) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(postForm(review, user), sendHtml)),
    M.orElse(() => showStartPage),
  )

const handlePersonaForm = (user: User) =>
  pipe(
    M.decodeBody(PersonaFormD.decode),
    M.ichainW(showCodeOfConductForm),
    M.orElse(() => pipe(M.decodeBody(ReviewFormD.decode), M.ichainW(showPersonaErrorForm(user)))),
    M.orElse(() => showReviewErrorForm),
  )

const handleCodeOfConductForm = (user: User) =>
  pipe(
    M.decodeBody(CodeOfConductFormD.decode),
    M.ichainW(showPostForm(user)),
    M.orElse(() => pipe(M.decodeBody(PersonaFormD.decode), M.ichainW(showCodeOfConductErrorForm))),
    M.orElse(() => pipe(M.decodeBody(ReviewFormD.decode), M.ichainW(showPersonaErrorForm(user)))),
    M.orElse(() => showReviewErrorForm),
  )

const handleForm = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.bindTo('user'),
  RM.apSW('action', RM.decodeBody(ActionD.decode)),
  RM.ichainW(({ action, user }) =>
    match(action)
      .with('review', () => RM.fromMiddleware(handleReviewForm(user)))
      .with('persona', () => RM.fromMiddleware(handlePersonaForm(user)))
      .with('conduct', () => RM.fromMiddleware(handleCodeOfConductForm(user)))
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

const showReviewErrorForm = pipe(M.status(Status.BadRequest), M.ichain(flow(reviewErrorForm, sendHtml)))

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

function postForm(review: CodeOfConductForm, user: User) {
  return page({
    title: "Post your PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <h1 id="preview-label">Check your PREreview</h1>

        <blockquote class="preview" tabindex="0" aria-labelledby="preview-label">
          <h2>Review of 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'</h2>

          <ol aria-label="Authors of this review" class="author-list">
            <li>${displayAuthor(review.persona === 'public' ? user : { name: 'PREreviewer' })}</li>
          </ol>

          ${rawHtml(markdownIt().render(review.review))}
        </blockquote>

        <form method="post" novalidate>
          <input name="persona" type="hidden" value="${review.persona}" />
          <input name="conduct" type="hidden" value="${review.conduct}" />

          <textarea name="review" hidden>${review.review}</textarea>

          <h2>Now post your PREreview</h2>

          <p>
            We will assign your PREreview a DOI (a permanent identifier) and make it publicly available under a
            <a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0 license</a>.
          </p>

          <button name="action" value="post">Post PREreview</button>
        </form>
      </main>
    `,
  })
}

function codeOfConductForm(review: PersonaForm) {
  return page({
    title: "Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <form method="post" novalidate>
          <fieldset role="group" aria-describedby="conduct-tip">
            <legend>
              <h1>Code of Conduct</h1>
            </legend>

            <div id="conduct-tip" role="note">
              As a member of our community, we expect you to abide by the
              <a href="https://content.prereview.org/coc/">PREreview Code&nbsp;of&nbsp;Conduct</a>.
            </div>

            <details>
              <summary>Example behaviors</summary>

              <ul>
                <li>Using welcoming and inclusive language.</li>
                <li>Providing feedback that is constructive, i.e. useful, to the receiver.</li>
                <li>Being respectful of differing viewpoints and experiences.</li>
                <li>Gracefully accepting constructive criticism.</li>
                <li>Focusing on what is best for the community.</li>
                <li>Showing empathy towards other community members.</li>
              </ul>
            </details>

            <label>
              <input name="conduct" type="checkbox" value="yes" />
              <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
            </label>
          </fieldset>

          <input name="persona" type="hidden" value="${review.persona}" />

          <textarea name="review" hidden>${review.review}</textarea>

          <button name="action" value="conduct">Next</button>
        </form>
      </main>
    `,
  })
}

function codeOfConductErrorForm(review: PersonaForm) {
  return page({
    title:
      "Error: Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <form method="post" novalidate>
          <div class="error">
            <fieldset role="group" aria-describedby="conduct-tip" aria-invalid="true" aria-errormessage="conduct-error">
              <legend>
                <h1>Code of Conduct</h1>
              </legend>

              <div id="conduct-tip" role="note">
                As a member of our community, we expect you to abide by the
                <a href="https://content.prereview.org/coc/">PREreview Code&nbsp;of&nbsp;Conduct</a>.
              </div>

              <details>
                <summary>Example behaviors</summary>

                <ul>
                  <li>Using welcoming and inclusive language.</li>
                  <li>Providing feedback that is constructive, i.e. useful, to the receiver.</li>
                  <li>Being respectful of differing viewpoints and experiences.</li>
                  <li>Gracefully accepting constructive criticism.</li>
                  <li>Focusing on what is best for the community.</li>
                  <li>Showing empathy towards other community members.</li>
                </ul>
              </details>

              <div id="conduct-error" role="alert">
                <span class="visually-hidden">Error:</span> Confirm that you are following the
                Code&nbsp;of&nbsp;Conduct.
              </div>

              <label>
                <input name="conduct" type="checkbox" value="yes" />
                <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
              </label>
            </fieldset>
          </div>

          <input name="persona" type="hidden" value="${review.persona}" />

          <textarea name="review" hidden>${review.review}</textarea>

          <button name="action" value="conduct">Next</button>
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
        <form method="post" novalidate>
          <fieldset role="group" aria-describedby="persona-tip">
            <legend>
              <h1>Publish as</h1>
            </legend>

            <div id="persona-tip" role="note">What name would you like to appear on your PREreview?</div>

            <ol>
              <li>
                <label>
                  <input name="persona" type="radio" value="public" aria-describedby="persona-tip-public" />
                  <span>${user.name}</span>
                </label>
                <div id="persona-tip-public" role="note">We’ll link your PREreview to your ORCID iD.</div>
              </li>
              <li>
                <label>
                  <input name="persona" type="radio" value="anonymous" aria-describedby="persona-tip-pseudonym" />
                  <span>PREreviewer</span>
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

function personaErrorForm(review: ReviewForm, user: User) {
  return page({
    title:
      "Error: Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <form method="post" novalidate>
          <div class="error">
            <fieldset role="group" aria-describedby="persona-tip" aria-invalid="true" aria-errormessage="persona-error">
              <legend>
                <h1>Publish as</h1>
              </legend>

              <div id="persona-tip" role="note">What name would you like to appear on your PREreview?</div>

              <div id="persona-error" role="alert"><span class="visually-hidden">Error:</span> Select a name.</div>

              <ol>
                <li>
                  <label>
                    <input name="persona" type="radio" value="public" aria-describedby="persona-tip-public" />
                    <span>${user.name}</span>
                  </label>
                  <div id="persona-tip-public" role="note">We’ll link your PREreview to your ORCID iD.</div>
                </li>
                <li>
                  <label>
                    <input name="persona" type="radio" value="anonymous" aria-describedby="persona-tip-pseudonym" />
                    <span>PREreviewer</span>
                  </label>
                  <div id="persona-tip-pseudonym" role="note">Your PREreview will be anonymous.</div>
                </li>
              </ol>
            </fieldset>
          </div>

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
        <form method="post" novalidate>
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

function reviewErrorForm() {
  return page({
    title:
      "Error: Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'",
    content: html`
      <main>
        <form method="post" novalidate>
          <div class="error">
            <h1>
              <label for="review">
                Write a PREreview of “The role of LHCBM1 in non-photochemical quenching in
                <i>Chlamydomonas reinhardtii</i>”
              </label>
            </h1>

            <div id="review-error" role="alert"><span class="visually-hidden">Error:</span> Enter your review.</div>

            <textarea
              id="review"
              name="review"
              rows="20"
              aria-invalid="true"
              aria-errormessage="review-error"
            ></textarea>
          </div>

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
