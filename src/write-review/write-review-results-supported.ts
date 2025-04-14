import { flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import { P, match } from 'ts-pattern'
import {
  type FieldDecoders,
  type Fields,
  type ValidFields,
  decodeFields,
  hasAnError,
  optionalDecoder,
  requiredDecoder,
} from '../form.js'
import { html, plainText, rawHtml, sendHtml } from '../html.js'
import { DefaultLocale, type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

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
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
            RM.fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, handleResultsSupportedForm)
          .otherwise(showResultsSupportedForm),
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
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showResultsSupportedForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    resultsSupportedForm(preprint, FormToFieldsE.encode(form), user, DefaultLocale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showResultsSupportedErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: ResultsSupportedForm) => resultsSupportedForm(preprint, form, user, DefaultLocale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleResultsSupportedForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(resultsSupportedFields)),
    RM.map(updateFormWithFields(form)),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
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
  resultsSupportedNotSupportedDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedPartiallySupportedDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedNeutralDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedWellSupportedDetails: optionalDecoder(NonEmptyStringC),
  resultsSupportedStronglySupportedDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof resultsSupportedFields>> = {
  encode: fields => ({
    resultsSupported: fields.resultsSupported,
    resultsSupportedDetails: {
      'not-supported': fields.resultsSupportedNotSupportedDetails,
      'partially-supported': fields.resultsSupportedPartiallySupportedDetails,
      neutral: fields.resultsSupportedNeutralDetails,
      'well-supported': fields.resultsSupportedWellSupportedDetails,
      'strongly-supported': fields.resultsSupportedStronglySupportedDetails,
    },
  }),
}

const FormToFieldsE: Encoder<ResultsSupportedForm, Form> = {
  encode: form => ({
    resultsSupported: E.right(form.resultsSupported),
    resultsSupportedNotSupportedDetails: E.right(form.resultsSupportedDetails?.['not-supported']),
    resultsSupportedPartiallySupportedDetails: E.right(form.resultsSupportedDetails?.['partially-supported']),
    resultsSupportedNeutralDetails: E.right(form.resultsSupportedDetails?.neutral),
    resultsSupportedWellSupportedDetails: E.right(form.resultsSupportedDetails?.['well-supported']),
    resultsSupportedStronglySupportedDetails: E.right(form.resultsSupportedDetails?.['strongly-supported']),
  }),
}

type ResultsSupportedForm = Fields<typeof resultsSupportedFields>

function resultsSupportedForm(
  preprint: PreprintTitle,
  form: ResultsSupportedForm,
  user: User,
  locale: SupportedLocale,
) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return templatePage({
    title: pipe(
      t('conclusionsSupported')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>
        <a href="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}" class="back"
          ><span>${t('backNav')()}</span></a
        >
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
                  <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                  <ul>
                    ${E.isLeft(form.resultsSupported)
                      ? html`
                          <li>
                            <a href="#results-supported-strongly-supported">
                              ${match(form.resultsSupported.left)
                                .with({ _tag: 'MissingE' }, () => t('selectConclusionsSupported')())
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
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(
                  E.isLeft(form.resultsSupported)
                    ? 'aria-invalid="true" aria-errormessage="results-supported-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>${t('conclusionsSupported')()}</h1>
                </legend>

                ${E.isLeft(form.resultsSupported)
                  ? html`
                      <div class="error-message" id="results-supported-error">
                        <span class="visually-hidden">${t('error')()}:</span>
                        ${match(form.resultsSupported.left)
                          .with({ _tag: 'MissingE' }, () => t('selectConclusionsSupported')())
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="resultsSupported"
                        id="results-supported-strongly-supported"
                        type="radio"
                        value="strongly-supported"
                        aria-describedby="results-supported-tip-strongly-supported"
                        aria-controls="results-supported-strongly-supported-control"
                        ${match(form.resultsSupported)
                          .with({ right: 'strongly-supported' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('conclusionsHighlySupported')()}</span>
                    </label>
                    <p id="results-supported-tip-strongly-supported" role="note">
                      ${t('conclusionsHighlySupportedTip')()}
                    </p>
                    <div class="conditional" id="results-supported-strongly-supported-control">
                      <div>
                        <label for="results-supported-strongly-supported-details" class="textarea"
                          >${t('conclusionsHighlySupportedWhy')()}</label
                        >

                        <textarea
                          name="resultsSupportedStronglySupportedDetails"
                          id="results-supported-strongly-supported-details"
                          rows="5"
                        >
${match(form.resultsSupportedStronglySupportedDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="resultsSupported"
                        type="radio"
                        value="well-supported"
                        aria-describedby="results-supported-tip-well-supported"
                        aria-controls="results-supported-well-supported-control"
                        ${match(form.resultsSupported)
                          .with({ right: 'well-supported' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('conclusionsSomewhatSupported')()}</span>
                    </label>
                    <p id="results-supported-tip-well-supported" role="note">
                      ${t('conclusionsSomewhatSupportedTip')()}
                    </p>
                    <div class="conditional" id="results-supported-well-supported-control">
                      <div>
                        <label for="results-supported-well-supported-details" class="textarea"
                          >${t('conclusionsSomewhatSupportedWhy')()}</label
                        >

                        <textarea
                          name="resultsSupportedWellSupportedDetails"
                          id="results-supported-well-supported-details"
                          rows="5"
                        >
${match(form.resultsSupportedWellSupportedDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="resultsSupported"
                        type="radio"
                        value="neutral"
                        aria-describedby="results-supported-tip-neutral"
                        aria-controls="results-supported-neutral-control"
                        ${match(form.resultsSupported)
                          .with({ right: 'neutral' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('conclusionsNeitherSupportedNorUnsupported')()}</span>
                    </label>
                    <p id="results-supported-tip-neutral" role="note">
                      ${t('conclusionsNeitherSupportedNorUnsupportedTip')()}
                    </p>
                    <div class="conditional" id="results-supported-neutral-control">
                      <div>
                        <label for="results-supported-neutral-details" class="textarea"
                          >${t('conclusionsNeitherSupportedNorUnsupportedWhy')()}</label
                        >

                        <textarea name="resultsSupportedNeutralDetails" id="results-supported-neutral-details" rows="5">
${match(form.resultsSupportedNeutralDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="resultsSupported"
                        type="radio"
                        value="partially-supported"
                        aria-describedby="results-supported-tip-partially-supported"
                        aria-controls="results-supported-partially-supported-control"
                        ${match(form.resultsSupported)
                          .with({ right: 'partially-supported' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('conclusionsSomewhatUnsupported')()}</span>
                    </label>
                    <p id="results-supported-tip-partially-supported" role="note">
                      ${t('conclusionsSomewhatUnsupportedTip')()}
                    </p>
                    <div class="conditional" id="results-supported-partially-supported-control">
                      <div>
                        <label for="results-supported-partially-supported-details" class="textarea"
                          >${t('conclusionsSomewhatUnsupportedWhy')()}</label
                        >

                        <textarea
                          name="resultsSupportedPartiallySupportedDetails"
                          id="results-supported-partially-supported-details"
                          rows="5"
                        >
${match(form.resultsSupportedPartiallySupportedDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="resultsSupported"
                        type="radio"
                        value="not-supported"
                        aria-describedby="results-supported-tip-not-supported"
                        aria-controls="results-supported-not-supported-control"
                        ${match(form.resultsSupported)
                          .with({ right: 'not-supported' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('conclusionsHighlyUnsupported')()}</span>
                    </label>
                    <p id="results-supported-tip-not-supported" role="note">
                      ${t('conclusionsHighlyUnsupportedTip')()}
                    </p>
                    <div class="conditional" id="results-supported-not-supported-control">
                      <div>
                        <label for="results-supported-not-supported-details" class="textarea"
                          >${t('conclusionsHighlyUnsupportedWhy')()}</label
                        >

                        <textarea
                          name="resultsSupportedNotSupportedDetails"
                          id="results-supported-not-supported-details"
                          rows="5"
                        >
${match(form.resultsSupportedNotSupportedDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <span>${t('or')()}</span>
                    <label>
                      <input
                        name="resultsSupported"
                        type="radio"
                        value="skip"
                        ${match(form.resultsSupported)
                          .with({ right: 'skip' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('iDoNotKnow')()}</span>
                    </label>
                  </li>
                </ol>
              </fieldset>
            </conditional-inputs>
          </div>

          <button>${t('saveAndContinueButton')()}</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    locale,
    user,
  })
}
