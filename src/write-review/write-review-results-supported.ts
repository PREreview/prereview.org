import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import { type FieldDecoders, type Fields, type ValidFields, decodeFields, hasAnError, requiredDecoder } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewResultsSupported = flow(
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
          .with({ method: 'POST' }, handleResultsSupportedForm)
          .otherwise(showResultsSupportedForm),
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

const showResultsSupportedForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    resultsSupportedForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showResultsSupportedErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: ResultsSupportedForm) => resultsSupportedForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleResultsSupportedForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(resultsSupportedFields)),
    RM.map(updateFormWithFields(form)),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ resultsSupported: P.any }, showResultsSupportedErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const resultsSupportedFields = {
  resultsSupported: requiredDecoder(
    D.literal('not-supported', 'partially-supported', 'neutral', 'well-supported', 'strongly-supported', 'skip'),
  ),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof resultsSupportedFields>> = {
  encode: fields => ({
    resultsSupported: fields.resultsSupported,
  }),
}

const FormToFieldsE: Encoder<ResultsSupportedForm, Form> = {
  encode: form => ({
    resultsSupported: E.right(form.resultsSupported),
  }),
}

type ResultsSupportedForm = Fields<typeof resultsSupportedFields>

function resultsSupportedForm(preprint: PreprintTitle, form: ResultsSupportedForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Are the results presented supported by the data?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.resultsSupported)
                      ? html`
                          <li>
                            <a href="#results-supported-not-supported">
                              ${match(form.resultsSupported.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select if the results presented are supported by the data',
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

          <div ${rawHtml(E.isLeft(form.resultsSupported) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.resultsSupported)
                  ? 'aria-invalid="true" aria-errormessage="results-supported-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Are the results presented supported by the data?</h1>
              </legend>

              ${E.isLeft(form.resultsSupported)
                ? html`
                    <div class="error-message" id="results-supported-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.resultsSupported.left)
                        .with({ _tag: 'MissingE' }, () => 'Select if the results presented are supported by the data')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      id="results-supported-not-supported"
                      type="radio"
                      value="not-supported"
                      aria-describedby="results-supported-tip-not-supported"
                      ${match(form.resultsSupported)
                        .with({ right: 'not-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Not supported</span>
                  </label>
                  <p id="results-supported-tip-not-supported" role="note">
                    Significant discrepancies, contradictions, or inconsistencies exist between the reported results and
                    the data provided or analyzed.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="partially-supported"
                      aria-describedby="results-supported-tip-partially-supported"
                      ${match(form.resultsSupported)
                        .with({ right: 'partially-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Partially supported</span>
                  </label>
                  <p id="results-supported-tip-partially-supported" role="note">
                    Some aspects of the data analysis or interpretation may raise concerns about the validity or
                    generalizability of the reported results.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="neutral"
                      aria-describedby="results-supported-tip-neutral"
                      ${match(form.resultsSupported)
                        .with({ right: 'neutral' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Neither supported nor not supported</span>
                  </label>
                  <p id="results-supported-tip-neutral" role="note">
                    Minor gaps or uncertainties in the data analysis could be addressed to further strengthen the
                    support for the reported results.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="well-supported"
                      aria-describedby="results-supported-tip-well-supported"
                      ${match(form.resultsSupported)
                        .with({ right: 'well-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Well supported</span>
                  </label>
                  <p id="results-supported-tip-well-supported" role="note">
                    The data analysis and interpretation are sound, and the presented results are consistent and
                    reliable.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="strongly-supported"
                      aria-describedby="results-supported-tip-strongly-supported"
                      ${match(form.resultsSupported)
                        .with({ right: 'strongly-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Strongly supported</span>
                  </label>
                  <p id="results-supported-tip-strongly-supported" role="note">
                    The data analysis is thorough, and the conclusions drawn from the data are highly reliable and
                    trustworthy.
                  </p>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="skip"
                      ${match(form.resultsSupported)
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
