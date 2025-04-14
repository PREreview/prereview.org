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
  writeReviewMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewReadyFullReview = flow(
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
          .with({ method: 'POST' }, handleReadyFullReviewForm)
          .otherwise(showReadyFullReviewForm),
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

const showReadyFullReviewForm = flow(
  RM.fromReaderK(
    ({ form, locale, preprint, user }: { form: Form; locale: SupportedLocale; preprint: PreprintTitle; user: User }) =>
      readyFullReviewForm(preprint, FormToFieldsE.encode(form), user, locale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReadyFullReviewErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: ReadyFullReviewForm) => readyFullReviewForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleReadyFullReviewForm = ({
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
    RM.decodeBody(decodeFields(readyFullReviewFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ readyFullReview: P.any }, showReadyFullReviewErrorForm(preprint, user, locale))
        .exhaustive(),
    ),
  )

const readyFullReviewFields = {
  readyFullReview: requiredDecoder(D.literal('no', 'yes-changes', 'yes')),
  readyFullReviewNoDetails: optionalDecoder(NonEmptyStringC),
  readyFullReviewYesChangesDetails: optionalDecoder(NonEmptyStringC),
  readyFullReviewYesDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof readyFullReviewFields>> = {
  encode: fields => ({
    readyFullReview: fields.readyFullReview,
    readyFullReviewDetails: {
      no: fields.readyFullReviewNoDetails,
      'yes-changes': fields.readyFullReviewYesChangesDetails,
      yes: fields.readyFullReviewYesDetails,
    },
  }),
}

const FormToFieldsE: Encoder<ReadyFullReviewForm, Form> = {
  encode: form => ({
    readyFullReview: E.right(form.readyFullReview),
    readyFullReviewNoDetails: E.right(form.readyFullReviewDetails?.no),
    readyFullReviewYesChangesDetails: E.right(form.readyFullReviewDetails?.['yes-changes']),
    readyFullReviewYesDetails: E.right(form.readyFullReviewDetails?.yes),
  }),
}

type ReadyFullReviewForm = Fields<typeof readyFullReviewFields>

function readyFullReviewForm(preprint: PreprintTitle, form: ReadyFullReviewForm, user: User, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return templatePage({
    title: pipe(
      t('readyForAttention')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>
        <a href="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" class="back"
          ><span>${t('backNav')()}</span></a
        >
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewReadyFullReviewMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                  <ul>
                    ${E.isLeft(form.readyFullReview)
                      ? html`
                          <li>
                            <a href="#ready-full-review-yes">
                              ${match(form.readyFullReview.left)
                                .with({ _tag: 'MissingE' }, () => t('selectReadyForAttention')())
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.readyFullReview) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(
                  E.isLeft(form.readyFullReview)
                    ? 'aria-invalid="true" aria-errormessage="ready-full-review-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>${t('readyForAttention')()}</h1>
                </legend>

                ${E.isLeft(form.readyFullReview)
                  ? html`
                      <div class="error-message" id="ready-full-review-error">
                        <span class="visually-hidden">${t('error')()}:</span>
                        ${match(form.readyFullReview.left)
                          .with({ _tag: 'MissingE' }, () => t('selectReadyForAttention')())
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="readyFullReview"
                        id="ready-full-review-yes"
                        type="radio"
                        value="yes"
                        aria-controls="ready-full-review-yes-control"
                        ${match(form.readyFullReview)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('readyForAttentionYes')()}</span>
                    </label>
                    <div class="conditional" id="ready-full-review-yes-control">
                      <div>
                        <label for="ready-full-review-yes-details" class="textarea"
                          >${t('readyForAttentionYesWhy')()}</label
                        >

                        <textarea name="readyFullReviewYesDetails" id="ready-full-review-yes-details" rows="5">
${match(form.readyFullReviewYesDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="readyFullReview"
                        type="radio"
                        value="yes-changes"
                        aria-controls="ready-full-review-yes-changes-control"
                        ${match(form.readyFullReview)
                          .with({ right: 'yes-changes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('readyForAttentionMinorChanges')()}</span>
                    </label>
                    <div class="conditional" id="ready-full-review-yes-changes-control">
                      <div>
                        <label for="ready-full-review-yes-changes-details" class="textarea"
                          >${t('readyForAttentionMinorChangesWhy')()}</label
                        >

                        <textarea
                          name="readyFullReviewYesChangesDetails"
                          id="ready-full-review-yes-changes-details"
                          rows="5"
                        >
${match(form.readyFullReviewYesChangesDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="readyFullReview"
                        type="radio"
                        value="no"
                        aria-controls="ready-full-review-no-control"
                        ${match(form.readyFullReview)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('readyForAttentionNo')()}</span>
                    </label>
                    <div class="conditional" id="ready-full-review-no-control">
                      <div>
                        <label for="ready-full-review-no-details" class="textarea"
                          >${t('readyForAttentionNoWhy')()}</label
                        >

                        <textarea name="readyFullReviewNoDetails" id="ready-full-review-no-details" rows="5">
${match(form.readyFullReviewNoDetails)
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
