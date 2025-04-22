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
import { type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewDataPresentationMatch,
  writeReviewMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewDataPresentation = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
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
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showDataPresentationForm = flow(
  RM.fromReaderK(
    ({ form, preprint, user, locale }: { form: Form; preprint: PreprintTitle; user: User; locale: SupportedLocale }) =>
      dataPresentationForm(preprint, FormToFieldsE.encode(form), user, locale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showDataPresentationErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: DataPresentationForm) => dataPresentationForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleDataPresentationForm = ({
  form,
  preprint,
  user,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RM.decodeBody(decodeFields(dataPresentationFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ dataPresentation: P.any }, showDataPresentationErrorForm(preprint, user, locale))
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

function dataPresentationForm(
  preprint: PreprintTitle,
  form: DataPresentationForm,
  user: User,
  locale: SupportedLocale,
) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return templatePage({
    title: pipe(
      t('areTheDataPresentationsWellSuited')(),
      errorPrefix(locale, error),
      prereviewOfSuffix(locale, preprint.title),
      plainText,
    ),
    content: html`
      <nav>
        <a href="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}" class="back"
          ><span>${translate(locale, 'forms', 'backLink')()}</span></a
        >
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

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
                  <h1>${t('areTheDataPresentationsWellSuited')()}</h1>
                </legend>

                ${E.isLeft(form.dataPresentation)
                  ? html`
                      <div class="error-message" id="data-presentation-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.dataPresentation.left)
                          .with({ _tag: 'MissingE' }, t('selectIfDataPresentationsWellSuited'))
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
                      <span>${t('highlyAppropriateAndClear')()}</span>
                    </label>
                    <p id="data-presentation-tip-highly-appropriate-clear" role="note">
                      ${t('highlyAppropriateAndClearTip')()}
                    </p>
                    <div class="conditional" id="data-presentation-highly-appropriate-clear-control">
                      <div>
                        <label for="data-presentation-highly-appropriate-clear-details" class="textarea"
                          >${t('highlyAppropriateAndClearWhy')()}</label
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
                      <span>${t('somewhatAppropriate')()}</span>
                    </label>
                    <p id="data-presentation-tip-mostly-appropriate-clear" role="note">
                      ${t('somewhatAppropriateTip')()}
                    </p>
                    <div class="conditional" id="data-presentation-mostly-appropriate-clear-control">
                      <div>
                        <label for="data-presentation-mostly-appropriate-clear-details" class="textarea"
                          >${t('somewhatAppropriateWhy')()}</label
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
                      <span>${t('neitherAppropriateOrClear')()}</span>
                    </label>
                    <p id="data-presentation-tip-neutral" role="note">${t('neitherAppropriateOrClearTip')()}</p>
                    <div class="conditional" id="data-presentation-neutral-control">
                      <div>
                        <label for="data-presentation-neutral-details" class="textarea"
                          >${t('neitherAppropriateOrClearWhy')()}</label
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
                      <span>${t('somewhatInappropriate')()}</span>
                    </label>
                    <p id="data-presentation-tip-somewhat-inappropriate-unclear" role="note">
                      ${t('somewhatInappropriateTip')()}
                    </p>
                    <div class="conditional" id="data-presentation-somewhat-inappropriate-unclear-control">
                      <div>
                        <label for="data-presentation-somewhat-inappropriate-unclear-details" class="textarea"
                          >${t('somewhatInappropriateWhy')()}</label
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
                      <span>${t('highlyInappropriate')()}</span>
                    </label>
                    <p id="data-presentation-tip-inappropriate-unclear" role="note">${t('highlyInappropriateTip')()}</p>
                    <div class="conditional" id="data-presentation-inappropriate-unclear-control">
                      <div>
                        <label for="data-presentation-inappropriate-unclear-details" class="textarea"
                          >${t('highlyInappropriateWhy')()}</label
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
                    <span>${translate(locale, 'forms', 'radioSeparatorLabel')()}</span>
                    <label>
                      <input
                        name="dataPresentation"
                        type="radio"
                        value="skip"
                        ${match(form.dataPresentation)
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

          ${saveAndContinueButton(locale)}
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`${translate(locale, 'skip-links', 'form')()}`, '#form']],
    type: 'streamline',
    locale,
    user,
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: DataPresentationForm) => html`
  ${E.isLeft(form.dataPresentation)
    ? html`
        <li>
          <a href="#data-presentation-highly-appropriate">
            ${match(form.dataPresentation.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'selectIfDataPresentationsWellSuited'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
