import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import {
  type FieldDecoders,
  type Fields,
  type ValidFields,
  decodeFields,
  hasAnError,
  optionalDecoder,
  requiredDecoder,
} from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { NonEmptyStringC } from '../string'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewFindingsNextSteps = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bindW(
        'canRapidReview',
        flow(
          fromReaderK(({ user }) => canRapidReview(user)),
          RM.filterOrElse(
            canRapidReview => canRapidReview,
            () => 'not-found' as const,
          ),
        ),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
            fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, handleFindingsNextStepsForm)
          .otherwise(showFindingsNextStepsForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('not-found', () => notFound)
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showFindingsNextStepsForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    findingsNextStepsForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showFindingsNextStepsErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: FindingsNextStepsForm) => findingsNextStepsForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleFindingsNextStepsForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(findingsNextStepsFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ findingsNextSteps: P.any }, showFindingsNextStepsErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const findingsNextStepsFields = {
  findingsNextSteps: requiredDecoder(
    D.literal('inadequately', 'insufficiently', 'adequately', 'clearly-insightfully', 'exceptionally', 'skip'),
  ),
  findingsNextStepsInadequatelyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsInsufficientlyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsAdequatelyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsClearlyInsightfullyDetails: optionalDecoder(NonEmptyStringC),
  findingsNextStepsExceptionallyDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof findingsNextStepsFields>> = {
  encode: fields => ({
    findingsNextSteps: fields.findingsNextSteps,
    findingsNextStepsDetails: {
      inadequately: fields.findingsNextStepsInadequatelyDetails,
      insufficiently: fields.findingsNextStepsInsufficientlyDetails,
      adequately: fields.findingsNextStepsAdequatelyDetails,
      'clearly-insightfully': fields.findingsNextStepsClearlyInsightfullyDetails,
      exceptionally: fields.findingsNextStepsExceptionallyDetails,
    },
  }),
}

const FormToFieldsE: Encoder<FindingsNextStepsForm, Form> = {
  encode: form => ({
    findingsNextSteps: E.right(form.findingsNextSteps),
    findingsNextStepsInadequatelyDetails: E.right(form.findingsNextStepsDetails?.inadequately),
    findingsNextStepsInsufficientlyDetails: E.right(form.findingsNextStepsDetails?.insufficiently),
    findingsNextStepsAdequatelyDetails: E.right(form.findingsNextStepsDetails?.adequately),
    findingsNextStepsClearlyInsightfullyDetails: E.right(form.findingsNextStepsDetails?.['clearly-insightfully']),
    findingsNextStepsExceptionallyDetails: E.right(form.findingsNextStepsDetails?.exceptionally),
  }),
}

type FindingsNextStepsForm = Fields<typeof findingsNextStepsFields>

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
            <conditional-inputs>
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
                        aria-controls="findings-next-steps-inadequately-control"
                        ${match(form.findingsNextSteps)
                          .with({ right: 'inadequately' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Inadequately</span>
                    </label>
                    <p id="findings-next-steps-tip-inadequately" role="note">
                      They fail to discuss, explain, or interpret their findings and potential next steps.
                    </p>
                    <div class="conditional" id="findings-next-steps-inadequately-control">
                      <div>
                        <label for="findings-next-steps-inadequately-details" class="textarea"
                          >Why is it inadequate? (optional)</label
                        >

                        <textarea
                          name="findingsNextStepsInadequatelyDetails"
                          id="findings-next-steps-inadequately-details"
                          rows="5"
                        >
${match(form.findingsNextStepsInadequatelyDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="findingsNextSteps"
                        type="radio"
                        value="insufficiently"
                        aria-describedby="findings-next-steps-tip-insufficiently"
                        aria-controls="findings-next-steps-insufficiently-control"
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
                    <div class="conditional" id="findings-next-steps-insufficiently-control">
                      <div>
                        <label for="findings-next-steps-insufficiently-details" class="textarea"
                          >Why is it insufficient? (optional)</label
                        >

                        <textarea
                          name="findingsNextStepsInsufficientlyDetails"
                          id="findings-next-steps-insufficiently-details"
                          rows="5"
                        >
${match(form.findingsNextStepsInsufficientlyDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="findingsNextSteps"
                        type="radio"
                        value="adequately"
                        aria-describedby="findings-next-steps-tip-adequately"
                        aria-controls="findings-next-steps-adequately-control"
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
                    <div class="conditional" id="findings-next-steps-adequately-control">
                      <div>
                        <label for="findings-next-steps-adequately-details" class="textarea"
                          >Why is it adequate? (optional)</label
                        >

                        <textarea
                          name="findingsNextStepsAdequatelyDetails"
                          id="findings-next-steps-adequately-details"
                          rows="5"
                        >
${match(form.findingsNextStepsAdequatelyDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="findingsNextSteps"
                        type="radio"
                        value="clearly-insightfully"
                        aria-describedby="findings-next-steps-tip-clearly-insightfully"
                        aria-controls="findings-next-steps-clearly-insightfully-control"
                        ${match(form.findingsNextSteps)
                          .with({ right: 'clearly-insightfully' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Clearly and insightfully</span>
                    </label>
                    <p id="findings-next-steps-tip-clearly-insightfully" role="note">
                      They provide clear and insightful discussion, explanation, and interpretation of their findings
                      and potential next steps.
                    </p>
                    <div class="conditional" id="findings-next-steps-clearly-insightfully-control">
                      <div>
                        <label for="findings-next-steps-clearly-insightfully-details" class="textarea"
                          >Why is it clear and insightful? (optional)</label
                        >

                        <textarea
                          name="findingsNextStepsClearlyInsightfullyDetails"
                          id="findings-next-steps-clearly-insightfully-details"
                          rows="5"
                        >
${match(form.findingsNextStepsClearlyInsightfullyDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="findingsNextSteps"
                        type="radio"
                        value="exceptionally"
                        aria-describedby="findings-next-steps-tip-exceptionally"
                        aria-controls="findings-next-steps-exceptionally-control"
                        ${match(form.findingsNextSteps)
                          .with({ right: 'exceptionally' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Exceptionally</span>
                    </label>
                    <p id="findings-next-steps-tip-exceptionally" role="note">
                      They demonstrate clarity, depth, and insight in their discussion, explanation, and interpretation
                      of their findings and potential next steps.
                    </p>
                    <div class="conditional" id="findings-next-steps-exceptionally-control">
                      <div>
                        <label for="findings-next-steps-exceptionally-details" class="textarea"
                          >Why is it exceptional? (optional)</label
                        >

                        <textarea
                          name="findingsNextStepsExceptionallyDetails"
                          id="findings-next-steps-exceptionally-details"
                          rows="5"
                        >
${match(form.findingsNextStepsExceptionallyDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
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
            </conditional-inputs>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
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
