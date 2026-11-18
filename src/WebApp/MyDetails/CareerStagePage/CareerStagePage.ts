import { Match, pipe, type Option } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { CareerStage } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const CareerStagePage = ({
  careerStage,
  error = false,
  locale,
}: {
  careerStage: Option.Option<CareerStage>
  error?: boolean
  locale: SupportedLocale
}) =>
  PageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(translate(locale, 'my-details', 'whatCareerStage')(), errorPrefix(locale, error), plainText),
    nav: html`<a href="${format(Routes.myDetailsMatch.formatter, {})}" class="back"
      >${translate(locale, 'forms', 'backLink')()}</a
    >`,
    main: html`
      <form method="post" action="${Routes.ChangeCareerStage}" novalidate>
        ${
          error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                  <ul>
                    <li>
                      <a href="#career-stage-early">${translate(locale, 'my-details', 'selectCareerStageError')()}</a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''
        }

        <div ${error ? rawHtml('class="error"') : ''}>
          <fieldset role="group" ${error ? rawHtml('aria-invalid="true" aria-errormessage="career-stage-error"') : ''}>
            <legend>
              <h1>${translate(locale, 'my-details', 'whatCareerStage')()}</h1>
            </legend>

            ${
              error
                ? html`
                    <div class="error-message" id="career-stage-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${translate(locale, 'my-details', 'selectCareerStageError')()}
                    </div>
                  `
                : ''
            }

            <ol>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="early"
                    id="career-stage-early"
                    ${Match.value(careerStage).pipe(
                      Match.when({ value: { value: 'early' } }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${translate(locale, 'my-details', 'early')()}
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="mid"
                    ${Match.value(careerStage).pipe(
                      Match.when({ value: { value: 'mid' } }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${translate(locale, 'my-details', 'mid')()}
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="late"
                    ${Match.value(careerStage).pipe(
                      Match.when({ value: { value: 'late' } }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${translate(locale, 'my-details', 'late')()}
                </label>
              </li>
              <li>
                ${translate(locale, 'forms', 'radioSeparatorLabel')()}
                <label>
                  <input name="careerStage" type="radio" value="skip" />
                  ${translate(locale, 'my-details', 'preferNotToSay')()}
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.ChangeCareerStage,
    js: error ? ['error-summary.js'] : [],
  })
