import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { JsonRecord } from 'fp-ts/Json'
import { ReaderTask } from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, constant, flow, pipe } from 'fp-ts/function'
import { getAssignSemigroup } from 'fp-ts/struct'
import { Status } from 'hyper-ts'
import { endSession, getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { Store } from 'keyv'
import markdownIt from 'markdown-it'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { SubmittedDeposition } from 'zenodo-ts'
import { html, rawHtml, sendHtml } from './html'
import { page } from './page'
import { logInMatch, preprintMatch, writeReviewMatch } from './routes'
import { NonEmptyString, NonEmptyStringC } from './string'
import { User, UserC } from './user'

const ReviewFormC = C.struct({
  review: NonEmptyStringC,
})

const PersonaFormC = C.struct({
  persona: C.literal('public', 'anonymous'),
})

const CodeOfConductFormC = C.struct({
  conduct: C.literal('yes'),
})

const FormC = C.partial({
  review: NonEmptyStringC,
  persona: C.literal('public', 'anonymous'),
  conduct: C.literal('yes'),
})

const CompletedFormC = pipe(ReviewFormC, C.intersect(PersonaFormC), C.intersect(CodeOfConductFormC))

const ActionD = pipe(
  D.struct({
    action: D.literal('review', 'persona', 'conduct', 'post'),
  }),
  D.map(get('action')),
)

type Form = C.TypeOf<typeof FormC>
type CompletedForm = C.TypeOf<typeof CompletedFormC>

export type NewPrereview = {
  conduct: 'yes'
  persona: 'public' | 'anonymous'
  review: NonEmptyString
  user: User
}

export interface CreateRecordEnv {
  createRecord: (newPrereview: NewPrereview) => TE.TaskEither<unknown, SubmittedDeposition>
}

export interface FormStoreEnv {
  formStore: Store<JsonRecord>
}

export const writeReview = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.bindTo('user'),
  RM.apSW('method', RM.decodeMethod(E.right)),
  RM.ichainW(({ user, method }) =>
    match(method)
      .with('POST', () => handleForm(user))
      .otherwise(() => RM.fromMiddleware(showReviewForm)),
  ),
  RM.orElseMiddlewareKW(() =>
    pipe(
      M.decodeMethod(D.literal('POST').decode),
      M.ichainW(() =>
        pipe(
          M.status(Status.SeeOther),
          M.ichain(() => M.header('Location', format(writeReviewMatch.formatter, {}))),
          M.ichain(() => M.closeHeaders()),
          M.ichain(() => M.end()),
        ),
      ),
    ),
  ),
  RM.orElseMiddlewareKW(() => showStartPage),
)

const handlePostForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.fromEither(CompletedFormC.decode(form)),
    RM.apS('user', RM.right(user)),
    RM.chainReaderTaskEitherKW(createRecord),
    RM.chainFirstReaderTaskKW(() => deleteForm(user.orcid)),
    RM.ichainW(deposition => showSuccessMessage(deposition.metadata.doi)),
    RM.orElseW(() => showFailureMessage),
  )

const showPersonaForm = (user: User) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(personaForm(user), sendHtml)),
  )

const showPersonaErrorForm = (user: User) =>
  pipe(
    M.status(Status.BadRequest),
    M.ichain(() => pipe(personaForm(user, true), sendHtml)),
    M.orElse(() => showStartPage),
  )

const showCodeOfConductForm = () =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(codeOfConductForm(), sendHtml)),
  )

const showCodeOfConductErrorForm = () =>
  pipe(
    M.status(Status.BadRequest),
    M.ichain(() => pipe(codeOfConductForm(true), sendHtml)),
  )

const handleReviewForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.decodeBody(ReviewFormC.decode),
    RM.map(updateForm(form)),
    RM.chainReaderTaskK(saveForm(user.orcid)),
    RM.ichainMiddlewareKW(() => showPersonaForm(user)),
    RM.orElseMiddlewareK(() => showReviewErrorForm),
  )

const showPostForm = (user: User) => (steps: CompletedForm) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(postForm(steps, user), sendHtml)),
    M.orElse(() => showStartPage),
  )

const handlePersonaForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.decodeBody(PersonaFormC.decode),
    RM.map(updateForm(form)),
    RM.chainReaderTaskK(saveForm(user.orcid)),
    RM.ichainMiddlewareKW(showCodeOfConductForm),
    RM.orElseMiddlewareK(() => showPersonaErrorForm(user)),
  )

const handleCodeOfConductForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.decodeBody(CodeOfConductFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid)),
    RM.chainEitherK(CompletedFormC.decode),
    RM.ichainMiddlewareKW(showPostForm(user)),
    RM.orElseMiddlewareK(showCodeOfConductErrorForm),
  )

const handleForm = (user: User) =>
  pipe(
    RM.right({ user }),
    RM.apSW('action', RM.decodeBody(ActionD.decode)),
    RM.apSW('form', RM.rightReaderTask(getForm(user.orcid))),
    RM.ichainW(state =>
      match(state)
        .with({ action: 'review' }, handleReviewForm)
        .with({ action: 'persona' }, handlePersonaForm)
        .with({ action: 'conduct' }, handleCodeOfConductForm)
        .with({ action: 'post' }, handlePostForm)
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

const createRecord = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ createRecord }: CreateRecordEnv) => createRecord(newPrereview)))

const showReviewForm = pipe(
  M.status(Status.OK),
  M.ichain(() => pipe(reviewForm(), sendHtml)),
)

const showReviewErrorForm = pipe(
  M.status(Status.BadRequest),
  M.ichain(() => pipe(reviewForm(true), sendHtml)),
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

function getForm(user: Orcid): ReaderTask<FormStoreEnv, Form> {
  return flow(
    TE.tryCatchK(async ({ formStore }) => await formStore.get(user), constant('no-new-review')),
    TE.chainEitherKW(FormC.decode),
    TE.getOrElse(() => T.of({})),
  )
}

function updateForm(originalForm: Form): (newForm: Form) => Form {
  return newForm => getAssignSemigroup<Form>().concat(originalForm, newForm)
}

function saveForm(user: Orcid): (form: Form) => ReaderTask<FormStoreEnv, void> {
  return form =>
    flow(
      TE.tryCatchK(async ({ formStore }) => {
        await formStore.set(user, FormC.encode(form))
      }, constVoid),
      TE.toUnion,
    )
}

function deleteForm(user: Orcid): ReaderTask<FormStoreEnv, void> {
  return flow(
    TE.tryCatchK(async ({ formStore }) => {
      await formStore.delete(user)
    }, constVoid),
    TE.toUnion,
  )
}

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

function postForm(review: CompletedForm, user: User) {
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

function codeOfConductForm(error = false) {
  return page({
    title: `${
      error ? 'Error: ' : ''
    }Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'`,
    content: html`
      <main>
        <form method="post" novalidate>
          <div ${rawHtml(error ? 'class="error"' : '')}>
            <fieldset
              role="group"
              aria-describedby="conduct-tip"
              ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="conduct-error"' : '')}
            >
              <legend>
                <h1>Code of Conduct</h1>
              </legend>

              <div id="conduct-tip" role="note">
                As a member of our community, we expect you to abide by the
                <a href="https://content.prereview.org/coc/">PREreview Code&nbsp;of&nbsp;Conduct</a>.
              </div>

              <details>
                <summary>Examples of expected behaviors</summary>

                <ul>
                  <li>Using welcoming and inclusive language.</li>
                  <li>Providing feedback that is constructive, i.e. useful, to the receiver.</li>
                  <li>Being respectful of differing viewpoints and experiences.</li>
                  <li>Gracefully accepting constructive criticism.</li>
                  <li>Focusing on what is best for the community.</li>
                  <li>Showing empathy towards other community members.</li>
                </ul>
              </details>

              <details>
                <summary>Examples of unacceptable behaviors</summary>

                <ul>
                  <li>Trolling, insulting or derogatory comments, and personal or political attacks.</li>
                  <li>Providing unconstructive or disruptive feedback on PREreview.</li>
                  <li>Public or private harassment.</li>
                  <li>
                    Publishing others’ confidential information, such as a physical or electronic address, without
                    explicit permission.
                  </li>
                  <li>Use of sexualized language or imagery and unwelcome sexual attention or advances.</li>
                  <li>Other conduct which could reasonably be considered inappropriate in a professional setting.</li>
                </ul>
              </details>

              ${error
                ? html`
                    <div id="conduct-error" role="alert">
                      <span class="visually-hidden">Error:</span> Confirm that you are following the
                      Code&nbsp;of&nbsp;Conduct.
                    </div>
                  `
                : ''}

              <label>
                <input name="conduct" type="checkbox" value="yes" />
                <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
              </label>
            </fieldset>
          </div>

          <button name="action" value="conduct">Next</button>
        </form>
      </main>
    `,
  })
}

function personaForm(user: User, error = false) {
  return page({
    title: `${
      error ? 'Error: ' : ''
    }Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'`,
    content: html`
      <main>
        <form method="post" novalidate>
          <div ${rawHtml(error ? 'class="error"' : '')}>
            <fieldset
              role="group"
              aria-describedby="persona-tip"
              ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="persona-error"' : '')}
            >
              <legend>
                <h1>Publish as</h1>
              </legend>

              <div id="persona-tip" role="note">What name would you like to appear on your PREreview?</div>

              ${error
                ? html`
                    <div id="persona-error" role="alert">
                      <span class="visually-hidden">Error:</span> Select a name.
                    </div>
                  `
                : ''}

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

          <button name="action" value="persona">Next</button>
        </form>
      </main>
    `,
  })
}

function reviewForm(error = false) {
  return page({
    title: `${
      error ? 'Error: ' : ''
    }Write your PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'`,
    content: html`
      <main>
        <form method="post" novalidate>
          <div ${rawHtml(error ? 'class="error"' : '')}>
            <h1><label for="review">Write your PREreview</label></h1>

            ${error
              ? html`
                  <div id="review-error" role="alert">
                    <span class="visually-hidden">Error:</span> Enter your PREreview.
                  </div>
                `
              : ''}

            <textarea
              id="review"
              name="review"
              rows="20"
              ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="review-error"' : '')}
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
    title: 'Review this preprint',
    content: html`
      <main>
        <h1>Review this preprint</h1>

        <p>
          You can write a PREreview of “The role of LHCBM1 in non-photochemical quenching in
          <i>Chlamydomonas reinhardtii</i>”. A PREreview is a free-text review of a preprint and can vary from a few
          sentences to a lengthy report, similar to a journal-organized peer-review report.
        </p>

        <h2>Before you start</h2>

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
