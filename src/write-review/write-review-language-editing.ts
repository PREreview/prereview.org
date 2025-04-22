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
  writeReviewLanguageEditingMatch,
  writeReviewMatch,
  writeReviewNovelMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
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
  RM.orElseW(error =>
    match(error)
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showLanguageEditingForm = flow(
  RM.fromReaderK(
    ({ form, locale, preprint, user }: { form: Form; locale: SupportedLocale; preprint: PreprintTitle; user: User }) =>
      languageEditingForm(preprint, FormToFieldsE.encode(form), user, locale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showLanguageEditingErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: LanguageEditingForm) => languageEditingForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
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
        .with('form-unavailable', () => serviceUnavailable)
        .with({ languageEditing: P.any }, showLanguageEditingErrorForm(preprint, user, locale))
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

function languageEditingForm(preprint: PreprintTitle, form: LanguageEditingForm, user: User, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return templatePage({
    title: pipe(
      t('benefitFromEditing')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>
        <a href="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}" class="back"
          ><span>${translate(locale, 'forms', 'backLink')()}</span></a
        >
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                  <ul>
                    ${E.isLeft(form.languageEditing)
                      ? html`
                          <li>
                            <a href="#language-editing-no">
                              ${match(form.languageEditing.left)
                                .with({ _tag: 'MissingE' }, () => t('selectBenefitFromEditing')())
                                .exhaustive()}
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
                  E.isLeft(form.languageEditing)
                    ? 'aria-invalid="true" aria-errormessage="language-editing-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>${t('benefitFromEditing')()}</h1>
                </legend>

                ${E.isLeft(form.languageEditing)
                  ? html`
                      <div class="error-message" id="language-editing-error">
                        <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                        ${match(form.languageEditing.left)
                          .with({ _tag: 'MissingE' }, () => t('selectBenefitFromEditing')())
                          .exhaustive()}
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
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    locale,
    user,
  })
}
