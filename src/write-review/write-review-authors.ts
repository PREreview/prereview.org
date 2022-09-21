import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { notFound, seeOther } from '../middleware'
import { page } from '../page'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
} from '../routes'
import { User, getUserFromSession } from '../user'
import { AuthorsFormC } from './completed-form'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleAuthorsForm).otherwise(showAuthorsForm)),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => notFound),
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
        .otherwise(showNextForm(preprint.doi)),
    ),
    RM.orElseW(() => showAuthorsErrorForm(preprint, user)),
  )

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
        <form method="post" action="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    <li>
                      <a href="#more-authors-no">Select yes if you wrote the PREreview with someone else</a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''}

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
                    <div class="error-message" id="more-authors-error">
                      <span class="visually-hidden">Error:</span> Select yes if you wrote the PREreview with someone
                      else
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      id="more-authors-no"
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
