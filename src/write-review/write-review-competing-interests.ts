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
import { writeReviewAuthorsMatch, writeReviewCompetingInterestsMatch, writeReviewMatch } from '../routes'
import { User, getUserFromSession } from '../user'
import { CompetingInterestsFormC, PartialCompetingInterestsFormC } from './completed-form'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewCompetingInterests = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleCompetingInterestsForm).otherwise(showCompetingInterestsForm),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => notFound),
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

const handleCompetingInterestsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(CompetingInterestsFormC.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
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

function competingInterestsForm(preprint: Preprint, form: Form, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Do you have any competing interests? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form
          method="post"
          action="${format(writeReviewCompetingInterestsMatch.formatter, { doi: preprint.doi })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${form.competingInterests !== 'yes'
                      ? html`
                          <li>
                            <a href="#competing-interests-no">Select yes if you have any competing interests</a>
                          </li>
                        `
                      : html`
                          <li>
                            <a href="#competing-interests-details">Enter details of your competing interests</a>
                          </li>
                        `}
                  </ul>
                </error-summary>
              `
            : ''}

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
                      <div class="error-message" id="competing-interests-error">
                        <span class="visually-hidden">Error:</span> Select yes if you have any competing interests
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="competingInterests"
                        id="competing-interests-no"
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
                              <div class="error-message" id="competing-interests-details-error">
                                <span class="visually-hidden">Error:</span> Enter details of your competing interests
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

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
