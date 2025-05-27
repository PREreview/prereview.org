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
import { writeReviewIntroductionMatchesMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { type NonEmptyString, NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewIntroductionMatches = ({
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
                .with({ method: 'POST' }, handleIntroductionMatchesForm)
                .otherwise(state => RT.of(showIntroductionMatchesForm(state))),
          ),
        ),
    ),
  )

const showIntroductionMatchesForm = ({
  form,
  locale,
  preprint,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
}) => introductionMatchesForm(preprint, FormToFieldsE.encode(form), locale)

const handleIntroductionMatchesForm = ({
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
    RTE.fromEither(decodeFields(introductionMatchesFields)(body)),
    RTE.map(updateFormWithFields(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ introductionMatches: P.any }, form => introductionMatchesForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const introductionMatchesFields = {
  introductionMatches: requiredDecoder(D.literal('yes', 'partly', 'no', 'skip')),
  introductionMatchesYesDetails: optionalDecoder(NonEmptyStringC),
  introductionMatchesPartlyDetails: optionalDecoder(NonEmptyStringC),
  introductionMatchesNoDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof introductionMatchesFields>> = {
  encode: fields => ({
    introductionMatches: fields.introductionMatches,
    introductionMatchesDetails: {
      yes: fields.introductionMatchesYesDetails,
      partly: fields.introductionMatchesPartlyDetails,
      no: fields.introductionMatchesNoDetails,
    },
  }),
}

const FormToFieldsE: Encoder<IntroductionMatchesForm, Form> = {
  encode: form => ({
    introductionMatches: E.right(form.introductionMatches),
    introductionMatchesYesDetails: E.right(form.introductionMatchesDetails?.yes),
    introductionMatchesPartlyDetails: E.right(form.introductionMatchesDetails?.partly),
    introductionMatchesNoDetails: E.right(form.introductionMatchesDetails?.no),
  }),
}

interface IntroductionMatchesForm {
  readonly introductionMatches: E.Either<MissingE, 'yes' | 'partly' | 'no' | 'skip' | undefined>
  readonly introductionMatchesYesDetails: E.Either<never, NonEmptyString | undefined>
  readonly introductionMatchesPartlyDetails: E.Either<never, NonEmptyString | undefined>
  readonly introductionMatchesNoDetails: E.Either<never, NonEmptyString | undefined>
}

function introductionMatchesForm(preprint: PreprintTitle, form: IntroductionMatchesForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('doesIntroductionExplain')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.introductionMatches)
                    ? html`
                        <li>
                          <a href="#introduction-matches-yes">
                            ${Match.valueTags(form.introductionMatches.left, {
                              MissingE: () => t('selectIntroductionExplains')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.introductionMatches) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.introductionMatches)
                  ? 'aria-invalid="true" aria-errormessage="introduction-matches-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('doesIntroductionExplain')()}</h1>
              </legend>

              ${E.isLeft(form.introductionMatches)
                ? html`
                    <div class="error-message" id="introduction-matches-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.introductionMatches.left, {
                        MissingE: () => t('selectIntroductionExplains')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      id="introduction-matches-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="introduction-matches-tip-yes"
                      aria-controls="introduction-matches-yes-control"
                      ${match(form.introductionMatches)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="introduction-matches-tip-yes" role="note">${t('clearlyExplainsTip')()}</p>
                  <div class="conditional" id="introduction-matches-yes-control">
                    <div>
                      <label for="introduction-matches-yes-details" class="textarea"
                        >${t('howIntroductionExplains')()}</label
                      >

                      <textarea name="introductionMatchesYesDetails" id="introduction-matches-yes-details" rows="5">
${match(form.introductionMatchesYesDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      type="radio"
                      value="partly"
                      aria-describedby="introduction-matches-tip-partly"
                      aria-controls="introduction-matches-partly-control"
                      ${match(form.introductionMatches)
                        .with({ right: 'partly' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="introduction-matches-tip-partly" role="note">${t('partlyTip')()}</p>
                  <div class="conditional" id="introduction-matches-partly-control">
                    <div>
                      <label for="introduction-matches-partly-details" class="textarea">${t('partlyHow')()}</label>

                      <textarea
                        name="introductionMatchesPartlyDetails"
                        id="introduction-matches-partly-details"
                        rows="5"
                      >
${match(form.introductionMatchesPartlyDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      type="radio"
                      value="no"
                      aria-describedby="introduction-matches-tip-no"
                      aria-controls="introduction-matches-no-control"
                      ${match(form.introductionMatches)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="introduction-matches-tip-no" role="note">${t('doesNotExplain')()}</p>
                  <div class="conditional" id="introduction-matches-no-control">
                    <div>
                      <label for="introduction-matches-no-details" class="textarea">${t('doesNotExplainHow')()}</label>

                      <textarea name="introductionMatchesNoDetails" id="introduction-matches-no-details" rows="5">
${match(form.introductionMatchesNoDetails)
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
                      name="introductionMatches"
                      type="radio"
                      value="skip"
                      ${match(form.introductionMatches)
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
