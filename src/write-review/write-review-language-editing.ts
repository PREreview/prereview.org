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
  writeReviewLanguageEditingMatch,
  writeReviewMatch,
  writeReviewNovelMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewLanguageEditing = ({
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
                .with({ method: 'POST' }, handleLanguageEditingForm)
                .otherwise(state => RT.of(showLanguageEditingForm(state))),
          ),
        ),
    ),
  )

const showLanguageEditingForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => languageEditingForm(preprint, FormToFieldsE.encode(form), locale)

const handleLanguageEditingForm = ({
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
    RTE.fromEither(decodeFields(languageEditingFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ languageEditing: P.any }, form => languageEditingForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const languageEditingFields = {
  languageEditing: requiredDecoder(D.literal('no', 'yes')),
  languageEditingNoDetails: optionalDecoder(NonEmptyStringC),
  languageEditingYesDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof languageEditingFields>> = {
  encode: fields => ({
    languageEditing: fields.languageEditing,
    languageEditingDetails: {
      no: fields.languageEditingNoDetails,
      yes: fields.languageEditingYesDetails,
    },
  }),
}

const FormToFieldsE: Encoder<LanguageEditingForm, Form> = {
  encode: form => ({
    languageEditing: E.right(form.languageEditing),
    languageEditingNoDetails: E.right(form.languageEditingDetails?.no),
    languageEditingYesDetails: E.right(form.languageEditingDetails?.yes),
  }),
}

type LanguageEditingForm = Fields<typeof languageEditingFields>

function languageEditingForm(preprint: PreprintTitle, form: LanguageEditingForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('benefitFromEditing')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.languageEditing)
                    ? html`
                        <li>
                          <a href="#language-editing-no">
                            ${Match.valueTags(form.languageEditing.left, {
                              MissingE: () => t('selectBenefitFromEditing')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.languageEditing) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.languageEditing) ? 'aria-invalid="true" aria-errormessage="language-editing-error"' : '',
              )}
            >
              <legend>
                <h1>${t('benefitFromEditing')()}</h1>
              </legend>

              ${E.isLeft(form.languageEditing)
                ? html`
                    <div class="error-message" id="language-editing-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.languageEditing.left, {
                        MissingE: () => t('selectBenefitFromEditing')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="languageEditing"
                      id="language-editing-no"
                      type="radio"
                      value="no"
                      aria-describedby="language-editing-tip-no"
                      aria-controls="language-editing-no-control"
                      ${match(form.languageEditing)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="language-editing-tip-no" role="note">${t('benefitFromEditingNoTip')()}</p>
                  <div class="conditional" id="language-editing-no-control">
                    <div>
                      <label for="language-editing-no-details" class="textarea"
                        >${t('benefitFromEditingNoWhy')()}</label
                      >

                      <textarea name="languageEditingNoDetails" id="language-editing-no-details" rows="5">
${match(form.languageEditingNoDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="languageEditing"
                      type="radio"
                      value="yes"
                      aria-describedby="language-editing-tip-yes"
                      aria-controls="language-editing-yes-control"
                      ${match(form.languageEditing)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="language-editing-tip-yes" role="note">${t('benefitFromEditingYesTip')()}</p>
                  <div class="conditional" id="language-editing-yes-control">
                    <div>
                      <label for="language-editing-yes-details" class="textarea"
                        >${t('benefitFromEditingYesWhy')()}</label
                      >

                      <textarea name="languageEditingYesDetails" id="language-editing-yes-details" rows="5">
${match(form.languageEditingYesDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
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
