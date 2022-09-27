import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { canAddAuthors } from '../feature-flags'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { notFound, seeOther } from '../middleware'
import { page } from '../page'
import {
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
} from '../routes'
import { NonEmptyString } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAddAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'canAddAuthors',
        fromReaderK(({ user }) => canAddAuthors(user)),
      ),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state)
          .with({ canAddAuthors: true, form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorsForm)
          .with({ canAddAuthors: true, form: { moreAuthors: 'yes' } }, showAddAuthorsForm)
          .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleCannotAddAuthorsForm)
          .with({ form: { moreAuthors: 'yes' } }, showCannotAddAuthorsForm)
          .otherwise(() => notFound),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => notFound),
)

const showAddAuthorsForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    addAuthorsForm(preprint, form.otherAuthors ?? []),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAddAuthorsErrorForm = flow(
  fromReaderK((preprint: Preprint, form: Form) => addAuthorsForm(preprint, form.otherAuthors ?? [], true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCannotAddAuthorsForm = flow(
  fromReaderK(({ preprint }: { preprint: Preprint }) => cannotAddAuthorsForm(preprint)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const handleAddAuthorsForm = ({ form, preprint }: { form: Form; preprint: Preprint }) =>
  pipe(
    RM.decodeBody(AddAuthorsFormD.decode),
    RM.ichainMiddlewareKW(state =>
      match(state)
        .with({ anotherAuthor: 'yes' }, () =>
          seeOther(format(writeReviewAddAuthorMatch.formatter, { doi: preprint.doi })),
        )
        .with({ anotherAuthor: 'no' }, () => showNextForm(preprint.doi)(form))
        .exhaustive(),
    ),
    RM.orElseW(() => showAddAuthorsErrorForm(preprint, form)),
  )

const handleCannotAddAuthorsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.of({ otherAuthors: [] }),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(() => showCannotAddAuthorsForm({ preprint })),
  )

const AddAuthorsFormD = D.struct({
  anotherAuthor: D.literal('yes', 'no'),
})

function addAuthorsForm(preprint: Preprint, authors: ReadonlyArray<NonEmptyString>, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Do you need to add another author? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    <li>
                      <a href="#another-author-no">Select yes if you need to add another author</a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''}

          <h1>You have added ${authors.length} other author${authors.length !== 1 ? 's' : ''}</h1>

          <ol class="summary-list">
            ${authors.map(name => html`<li>${name}</li>`)}
          </ol>

          <div ${rawHtml(error ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="another-author-error"' : '')}
            >
              <legend>
                <h2>Do you need to add another&nbsp;author?</h2>
              </legend>

              ${error
                ? html`
                    <div class="error-message" id="another-author-error">
                      <span class="visually-hidden">Error:</span> Select yes if you need to add another author
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input name="anotherAuthor" id="another-author-no" type="radio" value="no" />
                    <span>No</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input name="anotherAuthor" type="radio" value="yes" />
                    <span>Yes</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

function cannotAddAuthorsForm(preprint: Preprint) {
  return page({
    title: plainText`Add more authors – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          <h1>Add more authors</h1>

          <p>Unfortunately, we’re unable to add more authors now.</p>

          <p>Once you have posted your PREreview, please let us know their details, and we’ll add them.</p>

          <p>We’ll remind you to do this.</p>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
