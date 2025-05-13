import { Match, flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { StatusCodes } from 'http-status-codes'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
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
import { html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import type { TemplatePageEnv } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import type { PublicUrlEnv } from '../public-url.js'
import { StreamlinePageResponse, handlePageResponse } from '../response.js'
import {
  writeReviewLanguageEditingMatch,
  writeReviewMatch,
  writeReviewNovelMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import type { GetUserOnboardingEnv } from '../user-onboarding.js'
import { type GetUserEnv, type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewLanguageEditing = flow(
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
          .with({ method: 'POST' }, handleLanguageEditingForm)
          .otherwise(showLanguageEditingForm),
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
  RM.orElseW(
    Match.valueTags({
      PreprintIsNotFound: () => notFound,
      PreprintIsUnavailable: () => serviceUnavailable,
    }),
  ),
)

const showLanguageEditingForm = ({
  form,
  locale,
  preprint,
  user,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(languageEditingForm(preprint, FormToFieldsE.encode(form), locale))),
    RM.ichainW(handlePageResponse),
  )

const showLanguageEditingErrorForm = ({
  form,
  preprint,
  user,
  locale,
}: {
  form: LanguageEditingForm
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(languageEditingForm(preprint, form, locale))),
    RM.ichainW(handlePageResponse),
  )

const handleLanguageEditingForm = ({
  form,
  locale,
  preprint,
  user,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.decodeBody(decodeFields(languageEditingFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .returnType<
          RM.ReaderMiddleware<
            GetUserEnv & GetUserOnboardingEnv & { locale: SupportedLocale } & PublicUrlEnv & TemplatePageEnv,
            StatusOpen,
            ResponseEnded,
            never,
            void
          >
        >()
        .with('form-unavailable', () => serviceUnavailable)
        .with({ languageEditing: P.any }, form => showLanguageEditingErrorForm({ form, preprint, user, locale }))
        .exhaustive(),
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
