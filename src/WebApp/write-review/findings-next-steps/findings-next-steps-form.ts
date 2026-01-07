import { Match, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { writeReviewDataPresentationMatch, writeReviewFindingsNextStepsMatch } from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { prereviewOfSuffix } from '../shared-elements.ts'

export interface FindingsNextStepsForm {
  readonly findingsNextSteps: E.Either<
    MissingE,
    'inadequately' | 'insufficiently' | 'adequately' | 'clearly-insightfully' | 'exceptionally' | 'skip' | undefined
  >
  readonly findingsNextStepsInadequatelyDetails: E.Either<never, NonEmptyString | undefined>
  readonly findingsNextStepsInsufficientlyDetails: E.Either<never, NonEmptyString | undefined>
  readonly findingsNextStepsAdequatelyDetails: E.Either<never, NonEmptyString | undefined>
  readonly findingsNextStepsClearlyInsightfullyDetails: E.Either<never, NonEmptyString | undefined>
  readonly findingsNextStepsExceptionallyDetails: E.Either<never, NonEmptyString | undefined>
}

export function findingsNextStepsForm(preprint: PreprintTitle, form: FindingsNextStepsForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
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
