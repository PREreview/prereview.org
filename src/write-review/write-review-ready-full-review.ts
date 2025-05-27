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
  writeReviewMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { type NonEmptyString, NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewReadyFullReview = ({
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
                .with({ method: 'POST' }, handleReadyFullReviewForm)
                .otherwise(state => RT.of(showReadyFullReviewForm(state))),
          ),
        ),
    ),
  )

const showReadyFullReviewForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => readyFullReviewForm(preprint, FormToFieldsE.encode(form), locale)

const handleReadyFullReviewForm = ({
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
    RTE.fromEither(decodeFields(readyFullReviewFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ readyFullReview: P.any }, form => readyFullReviewForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
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

interface ReadyFullReviewForm {
  readonly readyFullReview: E.Either<MissingE, 'no' | 'yes-changes' | 'yes' | undefined>
  readonly readyFullReviewNoDetails: E.Either<never, NonEmptyString | undefined>
  readonly readyFullReviewYesChangesDetails: E.Either<never, NonEmptyString | undefined>
  readonly readyFullReviewYesDetails: E.Either<never, NonEmptyString | undefined>
}

function readyFullReviewForm(preprint: PreprintTitle, form: ReadyFullReviewForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('readyForAttention')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewReadyFullReviewMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.readyFullReview)
                    ? html`
                        <li>
                          <a href="#ready-full-review-yes">
                            ${Match.valueTags(form.readyFullReview.left, {
                              MissingE: () => t('selectReadyForAttention')(),
                            })}
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
                E.isLeft(form.readyFullReview) ? 'aria-invalid="true" aria-errormessage="ready-full-review-error"' : '',
              )}
            >
              <legend>
                <h1>${t('readyForAttention')()}</h1>
              </legend>

              ${E.isLeft(form.readyFullReview)
                ? html`
                    <div class="error-message" id="ready-full-review-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.readyFullReview.left, {
                        MissingE: () => t('selectReadyForAttention')(),
                      })}
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipToLabel: 'form',
  })
}
