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
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewShouldRead = flow(
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
          .with({ method: 'POST' }, handleShouldReadForm)
          .otherwise(showShouldReadForm),
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

const showShouldReadForm = flow(
  RM.fromReaderK(
    ({ form, locale, preprint, user }: { form: Form; locale: SupportedLocale; preprint: PreprintTitle; user: User }) =>
      shouldReadForm(preprint, FormToFieldsE.encode(form), user, locale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showShouldReadErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: ShouldReadForm) => shouldReadForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleShouldReadForm = ({
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
    RM.decodeBody(decodeFields(shouldReadFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ shouldRead: P.any }, showShouldReadErrorForm(preprint, user, locale))
        .exhaustive(),
    ),
  )

const shouldReadFields = {
  shouldRead: requiredDecoder(D.literal('no', 'yes-but', 'yes')),
  shouldReadNoDetails: optionalDecoder(NonEmptyStringC),
  shouldReadYesButDetails: optionalDecoder(NonEmptyStringC),
  shouldReadYesDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof shouldReadFields>> = {
  encode: fields => ({
    shouldRead: fields.shouldRead,
    shouldReadDetails: {
      no: fields.shouldReadNoDetails,
      'yes-but': fields.shouldReadYesButDetails,
      yes: fields.shouldReadYesDetails,
    },
  }),
}

const FormToFieldsE: Encoder<ShouldReadForm, Form> = {
  encode: form => ({
    shouldRead: E.right(form.shouldRead),
    shouldReadNoDetails: E.right(form.shouldReadDetails?.no),
    shouldReadYesButDetails: E.right(form.shouldReadDetails?.['yes-but']),
    shouldReadYesDetails: E.right(form.shouldReadDetails?.yes),
  }),
}

type ShouldReadForm = Fields<typeof shouldReadFields>

function shouldReadForm(preprint: PreprintTitle, form: ShouldReadForm, user: User, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return templatePage({
    title: pipe(
      t('wouldRecommend')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>
        <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}" class="back"
          ><span>${t('backNav')()}</span></a
        >
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                  <ul>
                    ${E.isLeft(form.shouldRead)
                      ? html`
                          <li>
                            <a href="#should-read-yes">
                              ${match(form.shouldRead.left)
                                .with({ _tag: 'MissingE' }, () => t('selectWouldRecommend')())
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.shouldRead) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(E.isLeft(form.shouldRead) ? 'aria-invalid="true" aria-errormessage="should-read-error"' : '')}
              >
                <legend>
                  <h1>${t('wouldRecommend')()}</h1>
                </legend>

                ${E.isLeft(form.shouldRead)
                  ? html`
                      <div class="error-message" id="should-read-error">
                        <span class="visually-hidden">${t('error')()}:</span>
                        ${match(form.shouldRead.left)
                          .with({ _tag: 'MissingE' }, () => t('selectWouldRecommend')())
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="shouldRead"
                        id="should-read-yes"
                        type="radio"
                        value="yes"
                        aria-controls="should-read-yes-control"
                        ${match(form.shouldRead)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('wouldRecommendYes')()}</span>
                    </label>
                    <div class="conditional" id="should-read-yes-control">
                      <div>
                        <label for="should-read-yes-details" class="textarea">${t('wouldRecommendYesHow')()}</label>

                        <textarea name="shouldReadYesDetails" id="should-read-yes-details" rows="5">
${match(form.shouldReadYesDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="shouldRead"
                        type="radio"
                        value="yes-but"
                        aria-controls="should-read-yes-but-control"
                        ${match(form.shouldRead)
                          .with({ right: 'yes-but' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('wouldRecommendYesImproved')()}</span>
                    </label>
                    <div class="conditional" id="should-read-yes-but-control">
                      <div>
                        <label for="should-read-yes-but-details" class="textarea"
                          >${t('wouldRecommendYesImprovedWhy')()}</label
                        >

                        <textarea name="shouldReadYesButDetails" id="should-read-yes-but-details" rows="5">
${match(form.shouldReadYesButDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="shouldRead"
                        type="radio"
                        value="no"
                        aria-controls="should-read-no-control"
                        ${match(form.shouldRead)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('wouldRecommendNo')()}</span>
                    </label>
                    <div class="conditional" id="should-read-no-control">
                      <div>
                        <label for="should-read-no-details" class="textarea">${t('wouldRecommendNoWhy')()}</label>

                        <textarea name="shouldReadNoDetails" id="should-read-no-details" rows="5">
${match(form.shouldReadNoDetails)
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
