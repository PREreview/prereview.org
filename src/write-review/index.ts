import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as R from 'fp-ts/Refinement'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import { endSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import markdownIt from 'markdown-it'
import { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { SubmittedDeposition } from 'zenodo-ts'
import { Html, html, plainText, rawHtml, sanitizeHtml, sendHtml } from '../html'
import { notFound, seeOther } from '../middleware'
import { page } from '../page'
import {
  preprintMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPostMatch,
  writeReviewReviewMatch,
} from '../routes'
import { User, getUserFromSession } from '../user'
import { CodeOfConductFormC, CompletedForm, CompletedFormC } from './completed-form'
import { Form, deleteForm, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export type NewPrereview = {
  conduct: 'yes'
  persona: 'public' | 'pseudonym'
  preprint: Preprint
  review: Html
  user: User
}

export interface CreateRecordEnv {
  createRecord: (newPrereview: NewPrereview) => TE.TaskEither<unknown, SubmittedDeposition>
}

export { GetPreprintTitleEnv } from './preprint'

export { FormStoreEnv } from './form'

export { writeReview } from './write-review'

export { writeReviewReview } from './write-review-review'

export { writeReviewPersona } from './write-review-persona'

export { writeReviewAuthors } from './write-review-authors'

export { writeReviewAddAuthors } from './write-review-add-authors'

export { writeReviewCompetingInterests } from './write-review-competing-interests'

export const writeReviewConduct = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleCodeOfConductForm).otherwise(showCodeOfConductForm),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => notFound),
)

export const writeReviewPost = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state)
          .with({ method: 'POST', form: P.when(R.fromEitherK(CompletedFormC.decode)) }, handlePostForm)
          .with({ method: 'POST', preprint: P.select() }, showFailureMessage)
          .with({ form: P.when(R.fromEitherK(CompletedFormC.decode)) }, showPostForm)
          .otherwise(flow(({ form }) => form, fromMiddlewareK(showNextForm(preprint.doi)))),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => notFound),
)

const handlePostForm = ({ form, preprint, user }: { form: CompletedForm; preprint: Preprint; user: User }) =>
  pipe(
    RM.rightReaderTask(deleteForm(user.orcid, preprint.doi)),
    RM.map(() => ({
      conduct: form.conduct,
      persona: form.persona,
      preprint,
      review: renderReview(form),
      user,
    })),
    RM.chainReaderTaskEitherKW(createRecord),
    RM.ichainW(deposition => showSuccessMessage(preprint, deposition.metadata.doi, form.moreAuthors === 'yes')),
    RM.orElseW(() => showFailureMessage(preprint)),
  )

const showCodeOfConductForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) => codeOfConductForm(preprint, form)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCodeOfConductErrorForm = flow(
  fromReaderK((preprint: Preprint) => codeOfConductForm(preprint, {}, true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const showPostForm = flow(
  fromReaderK(({ form, preprint, user }: { form: CompletedForm; preprint: Preprint; user: User }) =>
    postForm(preprint, form, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const handleCodeOfConductForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(CodeOfConductFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(() => showCodeOfConductErrorForm(preprint)),
  )

const createRecord = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ createRecord }: CreateRecordEnv) => createRecord(newPrereview)))

const showSuccessMessage = flow(
  fromReaderK(successMessage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirstW(() => endSession()),
  RM.ichainMiddlewareK(sendHtml),
)

const showFailureMessage = flow(
  fromReaderK(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainFirstW(() => endSession()),
  RM.ichainMiddlewareK(sendHtml),
)

function renderReview(form: CompletedForm) {
  return html`${sanitizeHtml(markdownIt({ html: true }).render(form.review))}

    <h3>Competing interests</h3>

    <p>
      ${form.competingInterests === 'yes'
        ? form.competingInterestsDetails
        : 'The author declares that they have no competing interests.'}
    </p>`
}

function successMessage(preprint: Preprint, doi: Doi, moreAuthors: boolean) {
  return page({
    title: plainText`PREreview posted`,
    content: html`
      <main>
        <div class="panel">
          <h1>PREreview posted</h1>

          <p>
            Your DOI <br />
            <strong class="doi" translate="no">${doi}</strong>
          </p>
        </div>

        <h2>What happens next</h2>

        <p>You’ll be able to see your PREreview shortly.</p>

        ${moreAuthors
          ? html`
              <div class="inset">
                <p>
                  Please let us know the other authors’ details (names and ORCID&nbsp;iDs), and we’ll add them to the
                  PREreview. Our email address is <a href="mailto:contact@prereview.org">contact@prereview.org</a>.
                </p>
              </div>
            `
          : ''}

        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="button">Back to preprint</a>
      </main>
    `,
  })
}

function failureMessage(preprint: Preprint) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to post your PREreview now.</p>

        <p>Please try again later.</p>

        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="button">Back to preprint</a>
      </main>
    `,
  })
}

function postForm(preprint: Preprint, review: CompletedForm, user: User) {
  return page({
    title: plainText`Post your PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewConductMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <h1 id="preview-label">Check your PREreview</h1>

        <blockquote class="preview" tabindex="0" aria-labelledby="preview-label">
          <h2>
            PREreview of “<span lang="${preprint.language}" dir="${getLangDir(preprint.language)}"
              >${preprint.title}</span
            >”
          </h2>

          <ol aria-label="Authors of this PREreview" class="author-list">
            <li>${displayAuthor(review.persona === 'public' ? user : { name: user.pseudonym })}</li>
          </ol>

          ${renderReview(review)}
        </blockquote>

        <div class="button-group" role="group">
          <a href="${format(writeReviewReviewMatch.formatter, { doi: preprint.doi })}" class="button button-secondary">
            Change PREreview
          </a>
          <a href="${format(writeReviewPersonaMatch.formatter, { doi: preprint.doi })}" class="button button-secondary">
            Change name
          </a>
        </div>

        <single-use-form>
          <form method="post" action="${format(writeReviewPostMatch.formatter, { doi: preprint.doi })}" novalidate>
            <h2>Now post your PREreview</h2>

            <p>
              We will assign your PREreview a DOI (a permanent identifier) and make it publicly available under a
              <a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0 license</a>.
            </p>

            <button>Post PREreview</button>
          </form>
        </single-use-form>
      </main>
    `,
    js: ['single-use-form.js', 'error-summary.js'],
  })
}

function codeOfConductForm(preprint: Preprint, form: Form, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Code of Conduct – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewCompetingInterestsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewConductMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    <li>
                      <a href="#conduct-yes">Confirm that you are following the Code&nbsp;of&nbsp;Conduct</a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''}

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

                <div>
                  <ul>
                    <li>Using welcoming and inclusive language.</li>
                    <li>Providing feedback that is constructive, i.e. useful, to the receiver.</li>
                    <li>Being respectful of differing viewpoints and experiences.</li>
                    <li>Gracefully accepting constructive criticism.</li>
                    <li>Focusing on what is best for the community.</li>
                    <li>Showing empathy towards other community members.</li>
                  </ul>
                </div>
              </details>

              <details>
                <summary>Examples of unacceptable behaviors</summary>

                <div>
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
                </div>
              </details>

              ${error
                ? html`
                    <div class="error-message" id="conduct-error">
                      <span class="visually-hidden">Error:</span> Confirm that you are following the
                      Code&nbsp;of&nbsp;Conduct
                    </div>
                  `
                : ''}

              <label>
                <input
                  name="conduct"
                  id="conduct-yes"
                  type="checkbox"
                  value="yes"
                  ${rawHtml(form.conduct === 'yes' ? 'checked' : '')}
                />
                <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
              </label>
            </fieldset>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
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

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
