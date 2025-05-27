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
  type MissingE,
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
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { type NonEmptyString, NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewShouldRead = ({
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
                .with({ method: 'POST' }, handleShouldReadForm)
                .otherwise(state => RT.of(showShouldReadForm(state))),
          ),
        ),
    ),
  )

const showShouldReadForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => shouldReadForm(preprint, FormToFieldsE.encode(form), locale)

const handleShouldReadForm = ({
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
    RTE.fromEither(decodeFields(shouldReadFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ shouldRead: P.any }, form => shouldReadForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
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

interface ShouldReadForm {
  readonly shouldRead: E.Either<MissingE, 'no' | 'yes-but' | 'yes' | undefined>
  readonly shouldReadNoDetails: E.Either<never, NonEmptyString | undefined>
  readonly shouldReadYesButDetails: E.Either<never, NonEmptyString | undefined>
  readonly shouldReadYesDetails: E.Either<never, NonEmptyString | undefined>
}

function shouldReadForm(preprint: PreprintTitle, form: ShouldReadForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('wouldRecommend')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.shouldRead)
                    ? html`
                        <li>
                          <a href="#should-read-yes">
                            ${Match.valueTags(form.shouldRead.left, {
                              MissingE: () => t('selectWouldRecommend')(),
                            })}
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
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.shouldRead.left, {
                        MissingE: () => t('selectWouldRecommend')(),
                      })}
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipToLabel: 'form',
  })
}
