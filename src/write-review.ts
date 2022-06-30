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
import { NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import { endSession, getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import { Store } from 'keyv'
import markdownIt from 'markdown-it'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { SubmittedDeposition } from 'zenodo-ts'
import { Html, html, plainText, rawHtml, sanitizeHtml, sendHtml } from './html'
import { handleError } from './http-error'
import { seeOther } from './middleware'
import { page } from './page'
import {
  logInMatch,
  preprintMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPostMatch,
  writeReviewReviewMatch,
} from './routes'
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

type Form = C.TypeOf<typeof FormC>
type CompletedForm = C.TypeOf<typeof CompletedFormC>

export type NewPrereview = {
  conduct: 'yes'
  persona: 'public' | 'anonymous'
  preprint: Preprint
  review: NonEmptyString
  user: User
}

type Preprint = {
  doi: Doi
  title: Html
}

export interface CreateRecordEnv {
  createRecord: (newPrereview: NewPrereview) => TE.TaskEither<unknown, SubmittedDeposition>
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: Doi) => TE.TaskEither<unknown, Html>
}

export interface FormStoreEnv {
  formStore: Store<JsonRecord>
}

const getPreprint = (doi: Doi) =>
  pipe(
    RTE.ask<GetPreprintTitleEnv>(),
    RTE.chainTaskEitherK(({ getPreprintTitle }) =>
      pipe(TE.Do, TE.apS('doi', TE.right(doi)), TE.apS('title', getPreprintTitle(doi))),
    ),
  )

const showNextForm = (form: Form) =>
  match(form)
    .with({ review: P.string, persona: P.string, conduct: P.string }, () =>
      seeOther(format(writeReviewPostMatch.formatter, {})),
    )
    .with({ review: P.string, persona: P.string }, () => seeOther(format(writeReviewConductMatch.formatter, {})))
    .with({ review: P.string }, () => seeOther(format(writeReviewPersonaMatch.formatter, {})))
    .otherwise(() => seeOther(format(writeReviewReviewMatch.formatter, {})))

export const writeReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getSession(),
      RM.chainEitherKW(UserC.decode),
      RM.chainReaderTaskKW(flow(get('orcid'), getForm)),
      RM.ichainMiddlewareKW(showNextForm),
      RM.orElseMiddlewareK(() => showStartPage(preprint)),
    ),
  ),
  RM.orElseMiddlewareK(() => handleError(new NotFound())),
)

export const writeReviewReview = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.bindTo('user'),
  RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid))),
  RM.apSW('method', RM.decodeMethod(E.right)),
  RM.ichainW(state =>
    match(state).with({ method: 'POST' }, handleReviewForm).otherwise(fromMiddlewareK(showReviewForm)),
  ),
  RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, {}))),
)

export const writeReviewPersona = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.bindTo('user'),
  RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid))),
  RM.apSW('method', RM.decodeMethod(E.right)),
  RM.ichainW(state =>
    match(state).with({ method: 'POST' }, handlePersonaForm).otherwise(fromMiddlewareK(showPersonaForm)),
  ),
  RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, {}))),
)

export const writeReviewConduct = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.bindTo('user'),
  RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid))),
  RM.apSW('method', RM.decodeMethod(E.right)),
  RM.ichainW(state =>
    match(state).with({ method: 'POST' }, handleCodeOfConductForm).otherwise(fromMiddlewareK(showCodeOfConductForm)),
  ),
  RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, {}))),
)

export const writeReviewPost = pipe(
  getSession(),
  RM.chainEitherKW(UserC.decode),
  RM.bindTo('user'),
  RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid))),
  RM.apSW('method', RM.decodeMethod(E.right)),
  RM.ichainW(state =>
    match(state)
      .with({ method: 'POST', form: { review: P.string, persona: P.string, conduct: P.string } }, handlePostForm)
      .with({ form: { review: P.string, persona: P.string, conduct: P.string } }, fromMiddlewareK(showPostForm))
      .otherwise(flow(get('form'), fromMiddlewareK(showNextForm))),
  ),
  RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, {}))),
)

const handlePostForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.fromEither(CompletedFormC.decode(form)),
    RM.apS(
      'preprint',
      RM.right({
        doi: '10.1101-2022.01.13.476201' as Doi,
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
      }),
    ),
    RM.apS('user', RM.right(user)),
    RM.chainReaderTaskEitherK(createRecord),
    RM.chainFirstReaderTaskKW(() => deleteForm(user.orcid)),
    RM.ichainW(deposition => showSuccessMessage(deposition.metadata.doi)),
    RM.orElseW(() => showFailureMessage),
  )

const showPersonaForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(personaForm(form, user), sendHtml)),
  )

const showPersonaErrorForm = (user: User) =>
  pipe(
    M.status(Status.BadRequest),
    M.ichain(() => pipe(personaForm({}, user, true), sendHtml)),
  )

const showCodeOfConductForm = ({ form }: { form: Form }) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(codeOfConductForm(form), sendHtml)),
  )

const showCodeOfConductErrorForm = () =>
  pipe(
    M.status(Status.BadRequest),
    M.ichain(() => pipe(codeOfConductForm({}, true), sendHtml)),
  )

const handleReviewForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.decodeBody(ReviewFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid)),
    RM.ichainMiddlewareKW(showNextForm),
    RM.orElseMiddlewareK(() => showReviewErrorForm),
  )

const showPostForm = ({ form, user }: { form: CompletedForm; user: User }) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(postForm(form, user), sendHtml)),
  )

const handlePersonaForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.decodeBody(PersonaFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid)),
    RM.ichainMiddlewareKW(showNextForm),
    RM.orElseMiddlewareK(() => showPersonaErrorForm(user)),
  )

const handleCodeOfConductForm = ({ form, user }: { form: Form; user: User }) =>
  pipe(
    RM.decodeBody(CodeOfConductFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid)),
    RM.ichainMiddlewareKW(showNextForm),
    RM.orElseMiddlewareK(showCodeOfConductErrorForm),
  )

const createRecord = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ createRecord }: CreateRecordEnv) => createRecord(newPrereview)))

const showReviewForm = ({ form }: { form: Form }) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(reviewForm(form), sendHtml)),
  )

const showReviewErrorForm = pipe(
  M.status(Status.BadRequest),
  M.ichain(() => pipe(reviewForm({}, true), sendHtml)),
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

const showStartPage = (preprint: Preprint) =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => pipe(startPage(preprint), sendHtml)),
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
    title: plainText`PREreview posted`,
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

        <a href="${format(preprintMatch.formatter, { doi: '10.1101/2022.01.13.476201' as Doi })}" class="button">
          Back to preprint
        </a>
      </main>
    `,
  })
}

function failureMessage() {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to post your PREreview now.</p>

        <p>Please try again later.</p>

        <a href="${format(preprintMatch.formatter, { doi: '10.1101/2022.01.13.476201' as Doi })}" class="button">
          Back to preprint
        </a>
      </main>
    `,
  })
}

function postForm(review: CompletedForm, user: User) {
  return page({
    title: plainText`Post your PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'`,
    content: html`
      <nav>
        <a href="${format(writeReviewConductMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main>
        <h1 id="preview-label">Check your PREreview</h1>

        <blockquote class="preview" tabindex="0" aria-labelledby="preview-label">
          <h2>Review of 'The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>'</h2>

          <ol aria-label="Authors of this review" class="author-list">
            <li>${displayAuthor(review.persona === 'public' ? user : { name: 'PREreviewer' })}</li>
          </ol>

          ${sanitizeHtml(markdownIt({ html: true }).render(review.review))}
        </blockquote>

        <div class="button-group" role="group">
          <a href="${format(writeReviewReviewMatch.formatter, {})}" class="button button-secondary">Change review</a>
          <a href="${format(writeReviewPersonaMatch.formatter, {})}" class="button button-secondary">Change name</a>
        </div>

        <form method="post" novalidate>
          <h2>Now post your PREreview</h2>

          <p>
            We will assign your PREreview a DOI (a permanent identifier) and make it publicly available under a
            <a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0 license</a>.
          </p>

          <button>Post PREreview</button>
        </form>
      </main>
    `,
  })
}

function codeOfConductForm(form: Form, error = false) {
  return page({
    title: plainText`${
      error ? 'Error: ' : ''
    }Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'`,
    content: html`
      <nav>
        <a href="${format(writeReviewPersonaMatch.formatter, {})}" class="back">Back</a>
      </nav>

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
                <input name="conduct" type="checkbox" value="yes" ${rawHtml(form.conduct === 'yes' ? 'checked' : '')} />
                <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
              </label>
            </fieldset>
          </div>

          <button>Next</button>
        </form>
      </main>
    `,
  })
}

function personaForm(form: Form, user: User, error = false) {
  return page({
    title: plainText`${
      error ? 'Error: ' : ''
    }Write a PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'`,
    content: html`
      <nav>
        <a href="${format(writeReviewReviewMatch.formatter, {})}" class="back">Back</a>
      </nav>

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
                    <input
                      name="persona"
                      type="radio"
                      value="public"
                      aria-describedby="persona-tip-public"
                      ${rawHtml(form.persona === 'public' ? 'checked' : '')}
                    />
                    <span>${user.name}</span>
                  </label>
                  <div id="persona-tip-public" role="note">We’ll link your PREreview to your ORCID iD.</div>
                </li>
                <li>
                  <label>
                    <input
                      name="persona"
                      type="radio"
                      value="anonymous"
                      aria-describedby="persona-tip-pseudonym"
                      ${rawHtml(form.persona === 'anonymous' ? 'checked' : '')}
                    />
                    <span>PREreviewer</span>
                  </label>
                  <div id="persona-tip-pseudonym" role="note">Your PREreview will be anonymous.</div>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Next</button>
        </form>
      </main>
    `,
  })
}

function reviewForm(form: Form, error = false) {
  return page({
    title: plainText`${
      error ? 'Error: ' : ''
    }Write your PREreview of 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii'`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: '10.1101/2022.01.13.476201' as Doi })}" class="back">
          Back to preprint
        </a>
      </nav>

      <main>
        <form method="post" novalidate>
          <div ${rawHtml(error ? 'class="error"' : '')}>
            <h1><label id="review-label" for="review">Write your PREreview</label></h1>

            ${error
              ? html`
                  <div id="review-error" role="alert">
                    <span class="visually-hidden">Error:</span> Enter your PREreview.
                  </div>
                `
              : ''}

            <html-editor>
              <textarea
                id="review"
                name="review"
                rows="20"
                ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="review-error"' : '')}
              >
${rawHtml(form.review ?? '')}</textarea
              >
            </html-editor>
          </div>

          <button>Next</button>
        </form>
      </main>
    `,
    js: ['html-editor.js'],
  })
}

function startPage(preprint: Preprint) {
  return page({
    title: plainText`Review this preprint`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main>
        <h1>Review this preprint</h1>

        <p>
          You can write a PREreview of “${preprint.title}”. A PREreview is a free-text review of a preprint and can vary
          from a few sentences to a lengthy report, similar to a journal-organized peer-review report.
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

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))
