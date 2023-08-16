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
          .with({ method: 'POST' }, handleDataPresentationForm)
          .otherwise(showDataPresentationForm),
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

const showDataPresentationForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    dataPresentationForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showDataPresentationErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: DataPresentationForm) => dataPresentationForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleDataPresentationForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(dataPresentationFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
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
    dataPresentationNeutralDetails: E.right(form.dataPresentationDetails?.['neutral']),
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
    }Are the data presentations, including visualizations, appropriate and clear?
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
                            <a href="#data-presentation-inappropriate-unclear">
                              ${match(form.dataPresentation.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select if the data presentations are appropriate and clear',
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
                  <h1>Are the data presentations, including visualizations, appropriate and clear?</h1>
                </legend>

                ${E.isLeft(form.dataPresentation)
                  ? html`
                      <div class="error-message" id="data-presentation-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.dataPresentation.left)
                          .with(
                            { _tag: 'MissingE' },
                            () => 'Select if the data presentations are appropriate and clear',
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
                        id="data-presentation-inappropriate-unclear"
                        type="radio"
                        value="inappropriate-unclear"
                        aria-describedby="data-presentation-tip-inappropriate-unclear"
                        aria-controls="data-presentation-inappropriate-unclear-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'inappropriate-unclear' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Inappropriate and unclear</span>
                    </label>
                    <p id="data-presentation-tip-inappropriate-unclear" role="note">
                      They lack proper labeling, appropriate scales, or relevant contextual information.
                    </p>
                    <div class="conditional" id="data-presentation-inappropriate-unclear-control">
                      <div>
                        <label for="data-presentation-inappropriate-unclear-details" class="textarea"
                          >Why are they inappropriate and unclear? (optional)</label
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
                      They contain minor inaccuracies, ambiguities, or omissions, making it slightly challenging to
                      comprehend or interpret the data effectively.
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
                        value="neutral"
                        aria-describedby="data-presentation-tip-neutral"
                        aria-controls="data-presentation-neutral-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'neutral' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Neither adequate nor inadequate</span>
                    </label>
                    <p id="data-presentation-tip-neutral" role="note">
                      They effectively convey the necessary information, employ appropriate labeling, and utilize
                      suitable visual elements to enhance comprehension.
                    </p>
                    <div class="conditional" id="data-presentation-neutral-control">
                      <div>
                        <label for="data-presentation-neutral-details" class="textarea"
                          >Why are they neither adequate nor inadequate? (optional)</label
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
                        value="mostly-appropriate-clear"
                        aria-describedby="data-presentation-tip-mostly-appropriate-clear"
                        aria-controls="data-presentation-mostly-appropriate-clear-control"
                        ${match(form.dataPresentation)
                          .with({ right: 'mostly-appropriate-clear' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Mostly appropriate and clear</span>
                    </label>
                    <p id="data-presentation-tip-mostly-appropriate-clear" role="note">
                      They represent the data well, allowing for a clear understanding of the findings and trends.
                    </p>
                    <div class="conditional" id="data-presentation-mostly-appropriate-clear-control">
                      <div>
                        <label for="data-presentation-mostly-appropriate-clear-details" class="textarea"
                          >Why are they mostly appropriate and clear? (optional)</label
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
                      They effectively communicate the key messages and patterns in the data.
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
