import { Match, flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { StatusCodes } from 'http-status-codes'
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
import { html, plainText, rawHtml } from '../html.js'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../preprint.js'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response.js'
import {
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewFindingsNextSteps = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.matchE(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with(
                  { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
                  () =>
                    RT.of(
                      RedirectResponse({ location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }) }),
                    ),
                )
                .with({ method: 'POST' }, handleFindingsNextStepsForm)
                .otherwise(state => RT.of(showFindingsNextStepsForm(state))),
          ),
        ),
    ),
  )

const showFindingsNextStepsForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => findingsNextStepsForm(preprint, FormToFieldsE.encode(form), locale)

const handleFindingsNextStepsForm = ({
  body,
  form,
  locale,
  preprint,
  user,
}: {
  body: unknown
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.fromEither(decodeFields(findingsNextStepsFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ findingsNextSteps: P.any }, form => findingsNextStepsForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
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

function findingsNextStepsForm(preprint: PreprintTitle, form: FindingsNextStepsForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('clearDiscussion')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html` <a href="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form
        method="post"
        action="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.findingsNextSteps)
                    ? html`
                        <li>
                          <a href="#findings-next-steps-exceptionally">
                            ${Match.valueTags(form.findingsNextSteps.left, {
                              MissingE: () => t('selectClearDiscussion')(),
                            })}
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
                <h1>${t('clearDiscussion')()}</h1>
              </legend>

              ${E.isLeft(form.findingsNextSteps)
                ? html`
                    <div class="error-message" id="findings-next-steps-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.findingsNextSteps.left, {
                        MissingE: () => t('selectClearDiscussion')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      id="findings-next-steps-exceptionally"
                      type="radio"
                      value="exceptionally"
                      aria-describedby="findings-next-steps-tip-exceptionally"
                      aria-controls="findings-next-steps-exceptionally-control"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'exceptionally' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('veryClearly')()}</span>
                  </label>
                  <p id="findings-next-steps-tip-exceptionally" role="note">${t('veryClearlyTip')()}</p>
                  <div class="conditional" id="findings-next-steps-exceptionally-control">
                    <div>
                      <label for="findings-next-steps-exceptionally-details" class="textarea"
                        >${t('veryClearlyHow')()}</label
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
                    <span>${t('somewhatClearly')()}</span>
                  </label>
                  <p id="findings-next-steps-tip-clearly-insightfully" role="note">${t('somewhatClearlyTip')()}</p>
                  <div class="conditional" id="findings-next-steps-clearly-insightfully-control">
                    <div>
                      <label for="findings-next-steps-clearly-insightfully-details" class="textarea"
                        >${t('somewhatClearlyHow')()}</label
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
                      value="adequately"
                      aria-describedby="findings-next-steps-tip-adequately"
                      aria-controls="findings-next-steps-adequately-control"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'adequately' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('neitherClearlyNorUnclearly')()}</span>
                  </label>
                  <p id="findings-next-steps-tip-adequately" role="note">${t('neitherClearlyNorUnclearlyTip')()}</p>
                  <div class="conditional" id="findings-next-steps-adequately-control">
                    <div>
                      <label for="findings-next-steps-adequately-details" class="textarea"
                        >${t('neitherClearlyNorUnclearlyHow')()}</label
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
                      value="insufficiently"
                      aria-describedby="findings-next-steps-tip-insufficiently"
                      aria-controls="findings-next-steps-insufficiently-control"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'insufficiently' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('somewhatUnclearly')()}</span>
                  </label>
                  <p id="findings-next-steps-tip-insufficiently" role="note">${t('somewhatUnclearlyTip')()}</p>
                  <div class="conditional" id="findings-next-steps-insufficiently-control">
                    <div>
                      <label for="findings-next-steps-insufficiently-details" class="textarea"
                        >${t('somewhatUnclearlyHow')()}</label
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
                      value="inadequately"
                      aria-describedby="findings-next-steps-tip-inadequately"
                      aria-controls="findings-next-steps-inadequately-control"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'inadequately' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('veryUnclearly')()}</span>
                  </label>
                  <p id="findings-next-steps-tip-inadequately" role="note">${t('veryUnclearlyTip')()}</p>
                  <div class="conditional" id="findings-next-steps-inadequately-control">
                    <div>
                      <label for="findings-next-steps-inadequately-details" class="textarea"
                        >${t('veryClearlyHow')()}</label
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
                  <span>${translate(locale, 'forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="skip"
                      ${match(form.findingsNextSteps)
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipToLabel: 'form',
  })
}
