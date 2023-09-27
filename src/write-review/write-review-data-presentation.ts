import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import { P, match } from 'ts-pattern'
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
  writeReviewMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { NonEmptyStringC } from '../string'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewDataPresentation = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
            RM.fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, handleDataPresentationForm)
          .otherwise(showDataPresentationForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
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

const showDataPresentationForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    dataPresentationForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showDataPresentationErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: DataPresentationForm) => dataPresentationForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleDataPresentationForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(dataPresentationFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ dataPresentation: P.any }, showDataPresentationErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const dataPresentationFields = {
  dataPresentation: requiredDecoder(
    D.literal(
      'inappropriate-unclear',
      'somewhat-inappropriate-unclear',
      'neutral',
      'mostly-appropriate-clear',
      'highly-appropriate-clear',
      'skip',
    ),
  ),
  dataPresentationInappropriateUnclearDetails: optionalDecoder(NonEmptyStringC),
  dataPresentationSomewhatInappropriateUnclearDetails: optionalDecoder(NonEmptyStringC),
  dataPresentationNeutralDetails: optionalDecoder(NonEmptyStringC),
  dataPresentationMostlyAppropriateClearDetails: optionalDecoder(NonEmptyStringC),
  dataPresentationHighlyAppropriateClearDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof dataPresentationFields>> = {
  encode: fields => ({
    dataPresentation: fields.dataPresentation,
    dataPresentationDetails: {
      'inappropriate-unclear': fields.dataPresentationInappropriateUnclearDetails,
      'somewhat-inappropriate-unclear': fields.dataPresentationSomewhatInappropriateUnclearDetails,
      neutral: fields.dataPresentationNeutralDetails,
      'mostly-appropriate-clear': fields.dataPresentationMostlyAppropriateClearDetails,
      'highly-appropriate-clear': fields.dataPresentationHighlyAppropriateClearDetails,
    },
  }),
}

const FormToFieldsE: Encoder<DataPresentationForm, Form> = {
  encode: form => ({
    dataPresentation: E.right(form.dataPresentation),
    dataPresentationInappropriateUnclearDetails: E.right(form.dataPresentationDetails?.['inappropriate-unclear']),
    dataPresentationSomewhatInappropriateUnclearDetails: E.right(
      form.dataPresentationDetails?.['somewhat-inappropriate-unclear'],
    ),
    dataPresentationNeutralDetails: E.right(form.dataPresentationDetails?.neutral),
    dataPresentationMostlyAppropriateClearDetails: E.right(form.dataPresentationDetails?.['mostly-appropriate-clear']),
    dataPresentationHighlyAppropriateClearDetails: E.right(form.dataPresentationDetails?.['highly-appropriate-clear']),
  }),
}

type DataPresentationForm = Fields<typeof dataPresentationFields>

function dataPresentationForm(preprint: PreprintTitle, form: DataPresentationForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${
      error ? 'Error: ' : ''
    }Are the data presentations, including visualizations, well-suited to represent the data?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.dataPresentation)
                      ? html`
                          <li>
                            <a href="#data-presentation-highly-appropriate">
                              ${match(form.dataPresentation.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select if the data presentations are well-suited to represent the data?',
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

          <div ${rawHtml(E.isLeft(form.dataPresentation) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(
                  E.isLeft(form.dataPresentation)
                    ? 'aria-invalid="true" aria-errormessage="data-presentation-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>Are the data presentations, including visualizations, well-suited to represent the data?</h1>
                </legend>

                ${E.isLeft(form.dataPresentation)
                  ? html`
                      <div class="error-message" id="data-presentation-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.dataPresentation.left)
                          .with(
                            { _tag: 'MissingE' },
                            () => 'Select if the data presentations are well-suited to represent the data?',
                          )
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="dataPresentation"
                        id="data-presentation-highly-appropriate"
                        type="radio"
                        value="highly-appropriate-clear"
                        aria-describedby="data-presentation-tip-highly-appropriate-clear"
                        aria-controls="data-presentation-highly-appropriate-clear-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'highly-appropriate-clear' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Highly appropriate and clear</span>
                    </label>
                    <p id="data-presentation-tip-highly-appropriate-clear" role="note">
                      They thoroughly follow accessibility best practices and effectively communicate the results and
                      key patterns in the data, making it very easy to comprehend or interpret the data.
                    </p>
                    <div class="conditional" id="data-presentation-highly-appropriate-clear-control">
                      <div>
                        <label for="data-presentation-highly-appropriate-clear-details" class="textarea"
                          >Why are they highly appropriate and clear? (optional)</label
                        >

                        <textarea
                          name="dataPresentationHighlyAppropriateClearDetails"
                          id="data-presentation-highly-appropriate-clear-details"
                          rows="5"
                        >
${match(form.dataPresentationHighlyAppropriateClearDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="dataPresentation"
                        type="radio"
                        value="mostly-appropriate-clear"
                        aria-describedby="data-presentation-tip-mostly-appropriate-clear"
                        aria-controls="data-presentation-mostly-appropriate-clear-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'mostly-appropriate-clear' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Somewhat appropriate and clear</span>
                    </label>
                    <p id="data-presentation-tip-mostly-appropriate-clear" role="note">
                      They follow accessibility best practices and well communicate the results and main patterns in the
                      data, making it easy to comprehend or interpret the data effectively.
                    </p>
                    <div class="conditional" id="data-presentation-mostly-appropriate-clear-control">
                      <div>
                        <label for="data-presentation-mostly-appropriate-clear-details" class="textarea"
                          >Why are they somewhat appropriate and clear? (optional)</label
                        >

                        <textarea
                          name="dataPresentationMostlyAppropriateClearDetails"
                          id="data-presentation-mostly-appropriate-clear-details"
                          rows="5"
                        >
${match(form.dataPresentationMostlyAppropriateClearDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="dataPresentation"
                        type="radio"
                        value="neutral"
                        aria-describedby="data-presentation-tip-neutral"
                        aria-controls="data-presentation-neutral-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'neutral' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Neither appropriate and clear nor inappropriate and unclear</span>
                    </label>
                    <p id="data-presentation-tip-neutral" role="note">
                      They follow some elements of accessibility best practices and communicate the results and
                      patterns. However, the presentations chosen are not the best or clearest ones to use for this kind
                      of data.
                    </p>
                    <div class="conditional" id="data-presentation-neutral-control">
                      <div>
                        <label for="data-presentation-neutral-details" class="textarea"
                          >Why are they neither appropriate and clear nor inappropriate and unclear? (optional)</label
                        >

                        <textarea name="dataPresentationNeutralDetails" id="data-presentation-neutral-details" rows="5">
${match(form.dataPresentationNeutralDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="dataPresentation"
                        type="radio"
                        value="somewhat-inappropriate-unclear"
                        aria-describedby="data-presentation-tip-somewhat-inappropriate-unclear"
                        aria-controls="data-presentation-somewhat-inappropriate-unclear-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'somewhat-inappropriate-unclear' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Somewhat inappropriate or unclear</span>
                    </label>
                    <p id="data-presentation-tip-somewhat-inappropriate-unclear" role="note">
                      They don’t follow accessibility best practices, and contain minor inaccuracies, ambiguities, or
                      omissions, making it slightly challenging to comprehend or interpret the data effectively.
                    </p>
                    <div class="conditional" id="data-presentation-somewhat-inappropriate-unclear-control">
                      <div>
                        <label for="data-presentation-somewhat-inappropriate-unclear-details" class="textarea"
                          >Why are they somewhat inappropriate or unclear? (optional)</label
                        >

                        <textarea
                          name="dataPresentationSomewhatInappropriateUnclearDetails"
                          id="data-presentation-somewhat-inappropriate-unclear-details"
                          rows="5"
                        >
${match(form.dataPresentationSomewhatInappropriateUnclearDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="dataPresentation"
                        type="radio"
                        value="inappropriate-unclear"
                        aria-describedby="data-presentation-tip-inappropriate-unclear"
                        aria-controls="data-presentation-inappropriate-unclear-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'inappropriate-unclear' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Highly inappropriate or unclear</span>
                    </label>
                    <p id="data-presentation-tip-inappropriate-unclear" role="note">
                      They present major accessibility barriers, and lack proper labeling, appropriate scales, or
                      relevant contextual information, making it very challenging to comprehend or interpret the data
                      effectively.
                    </p>
                    <div class="conditional" id="data-presentation-inappropriate-unclear-control">
                      <div>
                        <label for="data-presentation-inappropriate-unclear-details" class="textarea"
                          >Why are they highly inappropriate or unclear? (optional)</label
                        >

                        <textarea
                          name="dataPresentationInappropriateUnclearDetails"
                          id="data-presentation-inappropriate-unclear-details"
                          rows="5"
                        >
${match(form.dataPresentationInappropriateUnclearDetails)
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
                        name="dataPresentation"
                        type="radio"
                        value="skip"
                        ${match(form.dataPresentation)
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
