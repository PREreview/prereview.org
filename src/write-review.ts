import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { JsonRecord } from 'fp-ts/Json'
import { Reader } from 'fp-ts/Reader'
import { ReaderTask } from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as R from 'fp-ts/Refinement'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, constant, flow, pipe } from 'fp-ts/function'
import { getAssignSemigroup } from 'fp-ts/struct'
import { NotFound } from 'http-errors'
import { Status, StatusOpen } from 'hyper-ts'
import { endSession, getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import Keyv from 'keyv'
import markdownIt from 'markdown-it'
import { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { SubmittedDeposition } from 'zenodo-ts'
import { Html, html, plainText, rawHtml, sanitizeHtml, sendHtml } from './html'
import { handleError } from './http-error'
import { seeOther } from './middleware'
import { page } from './page'
import {
  logInMatch,
  preprintMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPostMatch,
  writeReviewReviewMatch,
} from './routes'
import { NonEmptyStringC } from './string'
import { User, UserC } from './user'

const ReviewFormC = C.struct({
  review: NonEmptyStringC,
})

const PersonaFormC = C.struct({
  persona: C.literal('public', 'anonymous'),
})

const AuthorsFormC = C.struct({
  moreAuthors: C.literal('yes', 'no'),
})

const PartialCompetingInterestsFormC = C.struct({
  competingInterests: C.literal('yes', 'no'),
})

const CompetingInterestsFormC = C.sum('competingInterests')({
  yes: C.struct({
    competingInterests: C.literal('yes'),
    competingInterestsDetails: NonEmptyStringC,
  }),
  no: C.struct({
    competingInterests: C.literal('no'),
  }),
})

const CodeOfConductFormC = C.struct({
  conduct: C.literal('yes'),
})

const FormC = C.partial({
  review: NonEmptyStringC,
  persona: C.literal('public', 'anonymous'),
  moreAuthors: C.literal('yes', 'no'),
  competingInterests: C.literal('yes', 'no'),
  competingInterestsDetails: NonEmptyStringC,
  conduct: C.literal('yes'),
})

const CompletedFormC = pipe(
  ReviewFormC,
  C.intersect(PersonaFormC),
  C.intersect(AuthorsFormC),
  C.intersect(CompetingInterestsFormC),
  C.intersect(CodeOfConductFormC),
)

type Form = C.TypeOf<typeof FormC>
type CompletedForm = C.TypeOf<typeof CompletedFormC>

export type NewPrereview = {
  conduct: 'yes'
  persona: 'public' | 'anonymous'
  preprint: Preprint
  review: Html
  user: User
}

type Preprint = {
  doi: Doi<'1101'>
  title: Html
}

export interface CreateRecordEnv {
  createRecord: (newPrereview: NewPrereview) => TE.TaskEither<unknown, SubmittedDeposition>
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: Doi<'1101'>) => TE.TaskEither<unknown, Html>
}

export interface FormStoreEnv {
  formStore: Keyv<JsonRecord>
}

const getPreprint = (doi: Doi<'1101'>) =>
  pipe(
    RTE.ask<GetPreprintTitleEnv>(),
    RTE.chainTaskEitherK(({ getPreprintTitle }) =>
      pipe(TE.Do, TE.apS('doi', TE.right(doi)), TE.apS('title', getPreprintTitle(doi))),
    ),
  )

const showNextForm = (preprint: Preprint) => (form: Form) =>
  match(form)
    .with(
      { review: P.string, persona: P.string, moreAuthors: P.string, competingInterests: P.string, conduct: P.string },
      () => seeOther(format(writeReviewPostMatch.formatter, { doi: preprint.doi })),
    )
    .with({ review: P.string, persona: P.string, moreAuthors: P.string, competingInterests: P.string }, () =>
      seeOther(format(writeReviewConductMatch.formatter, { doi: preprint.doi })),
    )
    .with({ review: P.string, persona: P.string, moreAuthors: P.string }, () =>
      seeOther(format(writeReviewCompetingInterestsMatch.formatter, { doi: preprint.doi })),
    )
    .with({ review: P.string, persona: P.string }, () =>
      seeOther(format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })),
    )
    .with({ review: P.string }, () => seeOther(format(writeReviewPersonaMatch.formatter, { doi: preprint.doi })))
    .otherwise(() => seeOther(format(writeReviewReviewMatch.formatter, { doi: preprint.doi })))

export const writeReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getSession(),
      RM.chainEitherKW(UserC.decode),
      RM.chainReaderTaskKW(user => getForm(user.orcid, preprint.doi)),
      RM.ichainMiddlewareKW(showNextForm(preprint)),
      RM.orElseW(() => showStartPage(preprint)),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
)

export const writeReviewReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', pipe(getSession(), RM.chainEitherKW(UserC.decode))),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleReviewForm).otherwise(showReviewForm)),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
)

export const writeReviewPersona = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', pipe(getSession(), RM.chainEitherKW(UserC.decode))),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handlePersonaForm).otherwise(showPersonaForm)),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
)

export const writeReviewAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', pipe(getSession(), RM.chainEitherKW(UserC.decode))),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleAuthorsForm).otherwise(showAuthorsForm)),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
)

export const writeReviewAddAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', pipe(getSession(), RM.chainEitherKW(UserC.decode))),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state)
          .with({ form: P.select({ moreAuthors: 'yes' }), method: 'POST' }, fromMiddlewareK(showNextForm(preprint)))
          .with({ form: { moreAuthors: 'yes' } }, showAddAuthorsForm)
          .otherwise(() => handleError(new NotFound())),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
)

export const writeReviewCompetingInterests = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', pipe(getSession(), RM.chainEitherKW(UserC.decode))),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleCompetingInterestsForm).otherwise(showCompetingInterestsForm),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
)

export const writeReviewConduct = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', pipe(getSession(), RM.chainEitherKW(UserC.decode))),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleCodeOfConductForm).otherwise(showCodeOfConductForm),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
)

export const writeReviewPost = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', pipe(getSession(), RM.chainEitherKW(UserC.decode))),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state)
          .with({ method: 'POST', form: P.when(R.fromEitherK(CompletedFormC.decode)) }, handlePostForm)
          .with({ method: 'POST', preprint: P.select() }, showFailureMessage)
          .with({ form: P.when(R.fromEitherK(CompletedFormC.decode)) }, showPostForm)
          .otherwise(flow(({ form }) => form, fromMiddlewareK(showNextForm(preprint)))),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => handleError(new NotFound())),
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

const showPersonaForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
    personaForm(preprint, form, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showPersonaErrorForm = flow(
  fromReaderK((preprint: Preprint, user: User) => personaForm(preprint, {}, user, true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAuthorsForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
    authorsForm(preprint, form, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAuthorsErrorForm = flow(
  fromReaderK((preprint: Preprint, user: User) => authorsForm(preprint, {}, user, true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAddAuthorsForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
    addAuthorsForm(preprint, form, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCompetingInterestsForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) => competingInterestsForm(preprint, form)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCompetingInterestsErrorForm = (preprint: Preprint) => (form: Form) =>
  pipe(
    RM.rightReader(competingInterestsForm(preprint, form, true)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
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

const handleReviewForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(ReviewFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint)),
    RM.orElseW(() => showReviewErrorForm(preprint)),
  )

const showPostForm = flow(
  fromReaderK(({ form, preprint, user }: { form: CompletedForm; preprint: Preprint; user: User }) =>
    postForm(preprint, form, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const handlePersonaForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(PersonaFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint)),
    RM.orElseW(() => showPersonaErrorForm(preprint, user)),
  )

const handleAuthorsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(AuthorsFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(form =>
      match(form)
        .with({ moreAuthors: 'yes' }, () =>
          seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })),
        )
        .otherwise(showNextForm(preprint)),
    ),
    RM.orElseW(() => showAuthorsErrorForm(preprint, user)),
  )

const handleCompetingInterestsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(CompetingInterestsFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint)),
    RM.orElseW(() =>
      pipe(
        RM.decodeBody(
          flow(
            PartialCompetingInterestsFormC.decode,
            E.altW(() => E.right({})),
          ),
        ),
        RM.ichain(showCompetingInterestsErrorForm(preprint)),
      ),
    ),
  )

const handleCodeOfConductForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(CodeOfConductFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint)),
    RM.orElseW(() => showCodeOfConductErrorForm(preprint)),
  )

const createRecord = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ createRecord }: CreateRecordEnv) => createRecord(newPrereview)))

const showReviewForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) => reviewForm(preprint, form)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReviewErrorForm = flow(
  fromReaderK((preprint: Preprint) => reviewForm(preprint, {}, true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

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

const showStartPage = flow(
  fromReaderK(startPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

function getForm(user: Orcid, preprint: Doi): ReaderTask<FormStoreEnv, Form> {
  return flow(
    TE.tryCatchK(async ({ formStore }) => await formStore.get(`${user}_${preprint}`), constant('no-new-review')),
    TE.chainEitherKW(FormC.decode),
    TE.getOrElse(() => T.of({})),
  )
}

function updateForm(originalForm: Form): (newForm: Form) => Form {
  return newForm => getAssignSemigroup<Form>().concat(originalForm, newForm)
}

function saveForm(user: Orcid, preprint: Doi): (form: Form) => ReaderTask<FormStoreEnv, void> {
  return form =>
    flow(
      TE.tryCatchK(async ({ formStore }) => {
        await formStore.set(`${user}_${preprint}`, FormC.encode(form))
      }, constVoid),
      TE.toUnion,
    )
}

function deleteForm(user: Orcid, preprint: Doi): ReaderTask<FormStoreEnv, void> {
  return flow(
    TE.tryCatchK(async ({ formStore }) => {
      await formStore.delete(`${user}_${preprint}`)
    }, constVoid),
    TE.toUnion,
  )
}

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
            <strong class="doi">${doi}</strong>
          </p>
        </div>

        <h2>What happens next</h2>

        <p>You’ll be able to see your PREreview shortly.</p>

        ${moreAuthors
          ? html`
              <div class="inset">
                <p>
                  Please let us know the other authors’ details (names and ORCID iDs), and we’ll add them to the
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
          <h2>PREreview of “${preprint.title}”</h2>

          <ol aria-label="Authors of this PREreview" class="author-list">
            <li>${displayAuthor(review.persona === 'public' ? user : { name: 'PREreviewer' })}</li>
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
          <form method="post" novalidate>
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
    js: ['single-use-form.js'],
  })
}

function competingInterestsForm(preprint: Preprint, form: Form, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Do you have any competing interests? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" novalidate>
          <div ${rawHtml(error && form.competingInterests !== 'yes' ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                aria-describedby="competing-interests-tip"
                ${rawHtml(
                  error && form.competingInterests !== 'yes'
                    ? 'aria-invalid="true" aria-errormessage="competing-interests-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>Do you have any competing interests?</h1>
                </legend>

                <div id="competing-interests-tip" role="note">
                  A competing interest is anything that could interfere with the objective of a PREreview.
                </div>

                <details>
                  <summary>Examples</summary>

                  <div>
                    <ul>
                      <li>You are the author of the preprint.</li>
                      <li>You have a personal relationship with the author.</li>
                      <li>You are a rival or competitor of the author.</li>
                      <li>You have recently worked with the author.</li>
                      <li>You collaborate with the author.</li>
                      <li>You have published with the author in the last five years.</li>
                      <li>You hold a grant with the author.</li>
                    </ul>
                  </div>
                </details>

                ${error && form.competingInterests !== 'yes'
                  ? html`
                      <div id="competing-interests-error" role="alert">
                        <span class="visually-hidden">Error:</span> Select yes if you have any competing interests.
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="competingInterests"
                        type="radio"
                        value="no"
                        ${rawHtml(form.competingInterests === 'no' ? 'checked' : '')}
                      />
                      <span>No</span>
                    </label>
                  </li>
                  <li>
                    <label>
                      <input
                        name="competingInterests"
                        type="radio"
                        value="yes"
                        aria-controls="competing-interests-details-control"
                        ${rawHtml(form.competingInterests === 'yes' ? 'checked' : '')}
                      />
                      <span>Yes</span>
                    </label>
                    <div class="conditional" id="competing-interests-details-control">
                      <div ${rawHtml(error && form.competingInterests === 'yes' ? 'class="error"' : '')}>
                        <label for="competing-interests-details" class="textarea">What are they?</label>

                        ${error && form.competingInterests === 'yes'
                          ? html`
                              <div id="competing-interests-details-error" role="alert">
                                <span class="visually-hidden">Error:</span> Enter details of your competing interests.
                              </div>
                            `
                          : ''}

                        <textarea
                          name="competingInterestsDetails"
                          id="competing-interests-details"
                          rows="5"
                          ${rawHtml(
                            error && form.competingInterests === 'yes'
                              ? 'aria-invalid="true" aria-errormessage="competing-interests-details-error"'
                              : '',
                          )}
                        >
${rawHtml(form.competingInterestsDetails ?? '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                </ol>
              </fieldset>
            </conditional-inputs>
          </div>

          <button>Next</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js'],
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

function addAuthorsForm(preprint: Preprint, form: Form, user: User, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Add more authors – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" novalidate>
          <h1>Add more authors</h1>

          <p>Unfortunately, we’re unable to add more authors now.</p>

          <p>Once you have posted your PREreview, please let us know their details, and we’ll add them.</p>

          <p>We’ll remind you to do this.</p>

          <button>Next</button>
        </form>
      </main>
    `,
  })
}

function authorsForm(preprint: Preprint, form: Form, user: User, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Did you write the PREreview with anyone else? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(writeReviewPersonaMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" novalidate>
          <div ${rawHtml(error ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="more-authors-error"' : '')}
            >
              <legend>
                <h1>Did you write the PREreview with anyone&nbsp;else?</h1>
              </legend>

              ${error
                ? html`
                    <div id="more-authors-error" role="alert">
                      <span class="visually-hidden">Error:</span> Select yes if you wrote the PREreview with someone
                      else.
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      type="radio"
                      value="no"
                      ${rawHtml(form.moreAuthors === 'no' ? 'checked' : '')}
                    />
                    <span>No, by myself</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      type="radio"
                      value="yes"
                      ${rawHtml(form.moreAuthors === 'yes' ? 'checked' : '')}
                    />
                    <span>Yes</span>
                  </label>
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

function personaForm(preprint: Preprint, form: Form, user: User, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}What name would you like to use? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewReviewMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" novalidate>
          <div ${rawHtml(error ? 'class="error"' : '')}>
            <fieldset role="group" ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="persona-error"' : '')}>
              <legend>
                <h1>What name would you like to use?</h1>
              </legend>

              ${error
                ? html`
                    <div id="persona-error" role="alert">
                      <span class="visually-hidden">Error:</span> Select the name that you would like to use.
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

function reviewForm(preprint: Preprint, form: Form, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Write your PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
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
    title: plainText`PREreview this preprint`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main>
        <h1>PREreview this preprint</h1>

        <p>
          You can write a PREreview of “${preprint.title}”. A PREreview is a free-text review of a preprint and can vary
          from a few sentences to a lengthy report, similar to a journal-organized peer-review report.
        </p>

        <h2>Before you start</h2>

        <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

        <details>
          <summary>What is an ORCID&nbsp;iD?</summary>

          <div>
            <p>
              An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a persistent digital identifier you own
              and control, distinguishing you from every other researcher.
            </p>
          </div>
        </details>

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

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
