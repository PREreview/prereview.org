import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { type MissingE, missingE } from '../form'
import { hasAnError } from '../form'
import { html, plainText, rawHtml } from '../html'
import { page } from '../page'
import type { PreprintTitle } from '../preprint'
import { writeReviewDataPresentationMatch, writeReviewFindingsNextStepsMatch } from '../routes'
import type { User } from '../user'
import type { Form } from './form'
import { type Step, writeReviewStepMiddleware } from './write-review-step-middleware'

const questionCanBeAnswerable = (form: Form) => form.alreadyWritten === 'no' && form.reviewType === 'questions'

const formToStepForm = (form: Form): FindingsNextStepsForm => ({ findingsNextSteps: E.right(form.findingsNextSteps) })

const decodeThisFormFromTheBody = flow(
  (body: unknown) => ({ findingsNextSteps: pipe(FindingsNextStepsFieldD.decode(body), E.mapLeft(missingE)) }),
  fields =>
    pipe(
      E.Do,
      E.apS('findingsNextSteps', fields.findingsNextSteps),
      E.mapLeft(() => fields),
    ),
)

const thisStep: Step<FindingsNextStepsForm> = {
  notFeaturedFlaggedByRapidReview: false,
  questionIsAnswerable: questionCanBeAnswerable,
  decoderThing: decodeThisFormFromTheBody,
  renderStepFormPage: findingsNextStepsForm,
  formToStepForm: formToStepForm,
}

export const writeReviewFindingsNextSteps = writeReviewStepMiddleware(thisStep)

const FindingsNextStepsFieldD = pipe(
  D.struct({
    findingsNextSteps: D.literal(
      'inadequately',
      'insufficiently',
      'adequately',
      'clearly-insightfully',
      'exceptionally',
      'skip',
    ),
  }),
  D.map(get('findingsNextSteps')),
)

type FindingsNextStepsForm = {
  readonly findingsNextSteps: E.Either<
    MissingE,
    'inadequately' | 'insufficiently' | 'adequately' | 'clearly-insightfully' | 'exceptionally' | 'skip' | undefined
  >
}

function findingsNextStepsForm(preprint: PreprintTitle, form: FindingsNextStepsForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${
      error ? 'Error: ' : ''
    }How well do the authors discuss, explain, and interpret their findings and potential next steps for the research?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.findingsNextSteps)
                      ? html`
                          <li>
                            <a href="#findings-next-steps-inadequately">
                              ${match(form.findingsNextSteps.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select how well the authors discuss their findings and next steps',
                                )
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.findingsNextSteps) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.findingsNextSteps)
                  ? 'aria-invalid="true" aria-errormessage="findings-next-steps-error"'
                  : '',
              )}
            >
              <legend>
                <h1>
                  How well do the authors discuss, explain, and interpret their findings and potential next steps for
                  the research?
                </h1>
              </legend>

              ${E.isLeft(form.findingsNextSteps)
                ? html`
                    <div class="error-message" id="findings-next-steps-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.findingsNextSteps.left)
                        .with(
                          { _tag: 'MissingE' },
                          () => 'Select how well the authors discuss their findings and next steps',
                        )
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      id="findings-next-steps-inadequately"
                      type="radio"
                      value="inadequately"
                      aria-describedby="findings-next-steps-tip-inadequately"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'inadequately' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Inadequately</span>
                  </label>
                  <p id="findings-next-steps-tip-inadequately" role="note">
                    They fail to discuss, explain, or interpret their findings and potential next steps.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="insufficiently"
                      aria-describedby="findings-next-steps-tip-insufficiently"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'insufficiently' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Insufficiently</span>
                  </label>
                  <p id="findings-next-steps-tip-insufficiently" role="note">
                    They provide limited or insufficient discussion, explanation, or interpretation of their findings
                    and potential next steps.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="adequately"
                      aria-describedby="findings-next-steps-tip-adequately"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'adequately' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Adequately</span>
                  </label>
                  <p id="findings-next-steps-tip-adequately" role="note">
                    They adequately discuss, explain, and interpret their findings and potential next steps for the
                    research.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="clearly-insightfully"
                      aria-describedby="findings-next-steps-tip-clearly-insightfully"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'clearly-insightfully' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Clearly and insightfully</span>
                  </label>
                  <p id="findings-next-steps-tip-clearly-insightfully" role="note">
                    They provide clear and insightful discussion, explanation, and interpretation of their findings and
                    potential next steps.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="exceptionally"
                      aria-describedby="findings-next-steps-tip-exceptionally"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'exceptionally' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Exceptionally</span>
                  </label>
                  <p id="findings-next-steps-tip-exceptionally" role="note">
                    They demonstrate clarity, depth, and insight in their discussion, explanation, and interpretation of
                    their findings and potential next steps.
                  </p>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="skip"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'skip' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>I don’t know</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}
