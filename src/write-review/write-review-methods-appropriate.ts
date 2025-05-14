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
  writeReviewIntroductionMatchesMatch,
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewMethodsAppropriate = ({
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
                .with({ method: 'POST' }, handleMethodsAppropriateForm)
                .otherwise(state => RT.of(showMethodsAppropriateForm(state))),
          ),
        ),
    ),
  )

const showMethodsAppropriateForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => methodsAppropriateForm(preprint, FormToFieldsE.encode(form), locale)

const handleMethodsAppropriateForm = ({
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
    RTE.fromEither(decodeFields(methodsAppropriateFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ methodsAppropriate: P.any }, form => methodsAppropriateForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const methodsAppropriateFields = {
  methodsAppropriate: requiredDecoder(
    D.literal(
      'inappropriate',
      'somewhat-inappropriate',
      'adequate',
      'mostly-appropriate',
      'highly-appropriate',
      'skip',
    ),
  ),
  methodsAppropriateInappropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateSomewhatInappropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateAdequateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateMostlyAppropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateHighlyAppropriateDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof methodsAppropriateFields>> = {
  encode: fields => ({
    methodsAppropriate: fields.methodsAppropriate,
    methodsAppropriateDetails: {
      inappropriate: fields.methodsAppropriateInappropriateDetails,
      'somewhat-inappropriate': fields.methodsAppropriateSomewhatInappropriateDetails,
      adequate: fields.methodsAppropriateAdequateDetails,
      'mostly-appropriate': fields.methodsAppropriateMostlyAppropriateDetails,
      'highly-appropriate': fields.methodsAppropriateHighlyAppropriateDetails,
    },
  }),
}

const FormToFieldsE: Encoder<MethodsAppropriateForm, Form> = {
  encode: form => ({
    methodsAppropriate: E.right(form.methodsAppropriate),
    methodsAppropriateInappropriateDetails: E.right(form.methodsAppropriateDetails?.inappropriate),
    methodsAppropriateSomewhatInappropriateDetails: E.right(form.methodsAppropriateDetails?.['somewhat-inappropriate']),
    methodsAppropriateAdequateDetails: E.right(form.methodsAppropriateDetails?.adequate),
    methodsAppropriateMostlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['mostly-appropriate']),
    methodsAppropriateHighlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['highly-appropriate']),
  }),
}

type MethodsAppropriateForm = Fields<typeof methodsAppropriateFields>

function methodsAppropriateForm(preprint: PreprintTitle, form: MethodsAppropriateForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('methodsWellSuited')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.methodsAppropriate)
                    ? html`
                        <li>
                          <a href="#methods-appropriate-highly-appropriate">
                            ${Match.valueTags(form.methodsAppropriate.left, {
                              MissingE: () => t('selectMethodsWellSuited')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.methodsAppropriate) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.methodsAppropriate)
                  ? 'aria-invalid="true" aria-errormessage="methods-appropriate-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('methodsWellSuited')()}</h1>
              </legend>

              ${E.isLeft(form.methodsAppropriate)
                ? html`
                    <div class="error-message" id="methods-appropriate-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.methodsAppropriate.left, {
                        MissingE: () => t('selectMethodsWellSuited')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      id="methods-appropriate-highly-appropriate"
                      type="radio"
                      value="highly-appropriate"
                      aria-describedby="methods-appropriate-tip-highly-appropriate"
                      aria-controls="methods-appropriate-highly-appropriate-control"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'highly-appropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('methodsHighlyAppropriate')()}</span>
                  </label>
                  <p id="methods-appropriate-tip-highly-appropriate" role="note">
                    ${t('methodsHighlyAppropriateTip')()}
                  </p>
                  <div class="conditional" id="methods-appropriate-highly-appropriate-control">
                    <div>
                      <label for="methods-appropriate-highly-appropriate-details" class="textarea"
                        >${t('methodsHighlyAppropriateHow')()}</label
                      >

                      <textarea
                        name="methodsAppropriateHighlyAppropriateDetails"
                        id="methods-appropriate-highly-appropriate-details"
                        rows="5"
                      >
${match(form.methodsAppropriateHighlyAppropriateDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="mostly-appropriate"
                      aria-describedby="methods-appropriate-tip-mostly-appropriate"
                      aria-controls="methods-appropriate-mostly-appropriate-control"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'mostly-appropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('methodsSomewhatAppropriate')()}</span>
                  </label>
                  <p id="methods-appropriate-tip-mostly-appropriate" role="note">
                    ${t('methodsSomewhatAppropriateTip')()}
                  </p>
                  <div class="conditional" id="methods-appropriate-mostly-appropriate-control">
                    <div>
                      <label for="methods-appropriate-mostly-appropriate-details" class="textarea"
                        >${t('methodsSomewhatAppropriateWhy')()}</label
                      >

                      <textarea
                        name="methodsAppropriateMostlyAppropriateDetails"
                        id="methods-appropriate-mostly-appropriate-details"
                        rows="5"
                      >
${match(form.methodsAppropriateMostlyAppropriateDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="adequate"
                      aria-describedby="methods-appropriate-tip-adequate"
                      aria-controls="methods-appropriate-adequate-control"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'adequate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('methodsNeitherAppropriateNorInappropriate')()}</span>
                  </label>
                  <p id="methods-appropriate-tip-adequate" role="note">
                    ${t('methodsNeitherAppropriateNorInappropriateTip')()}
                  </p>
                  <div class="conditional" id="methods-appropriate-adequate-control">
                    <div>
                      <label for="methods-appropriate-adequate-details" class="textarea"
                        >${t('methodsNeitherAppropriateNorInappropriateWhy')()}</label
                      >

                      <textarea
                        name="methodsAppropriateAdequateDetails"
                        id="methods-appropriate-adequate-details"
                        rows="5"
                      >
${match(form.methodsAppropriateAdequateDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="somewhat-inappropriate"
                      aria-describedby="methods-appropriate-tip-somewhat-inappropriate"
                      aria-controls="methods-appropriate-somewhat-inappropriate-control"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'somewhat-inappropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('methodsSomewhatInappropriate')()}</span>
                  </label>
                  <p id="methods-appropriate-tip-somewhat-inappropriate" role="note">
                    ${t('methodsSomewhatInappropriateTip')()}
                  </p>
                  <div class="conditional" id="methods-appropriate-somewhat-inappropriate-control">
                    <div>
                      <label for="methods-appropriate-somewhat-inappropriate-details" class="textarea"
                        >${t('methodsSomewhatInappropriateWhy')()}</label
                      >

                      <textarea
                        name="methodsAppropriateSomewhatInappropriateDetails"
                        id="methods-appropriate-somewhat-inappropriate-details"
                        rows="5"
                      >
${match(form.methodsAppropriateSomewhatInappropriateDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="inappropriate"
                      aria-describedby="methods-appropriate-tip-inappropriate"
                      aria-controls="methods-appropriate-inappropriate-control"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'inappropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('methodsHighlyInappropriate')()}</span>
                  </label>
                  <p id="methods-appropriate-tip-inappropriate" role="note">${t('methodsHighlyInappropriateTip')()}</p>
                  <div class="conditional" id="methods-appropriate-inappropriate-control">
                    <div>
                      <label for="methods-appropriate-inappropriate-details" class="textarea"
                        >${t('methodsHighlyInappropriateWhy')()}</label
                      >

                      <textarea
                        name="methodsAppropriateInappropriateDetails"
                        id="methods-appropriate-inappropriate-details"
                        rows="5"
                      >
${match(form.methodsAppropriateInappropriateDetails)
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
                      name="methodsAppropriate"
                      type="radio"
                      value="skip"
                      ${match(form.methodsAppropriate)
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
