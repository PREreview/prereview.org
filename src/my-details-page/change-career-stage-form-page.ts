import { format } from 'fp-ts-routing'
import type * as O from 'fp-ts/Option'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import type { CareerStage } from '../career-stage'
import { html, plainText, rawHtml } from '../html'
import { PageResponse } from '../response'
import { changeCareerStageMatch, myDetailsMatch } from '../routes'

export const createFormPage = ({
  careerStage,
  error = false,
}: {
  careerStage: O.Option<CareerStage>
  error?: boolean
}) =>
  PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}What career stage are you at?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeCareerStageMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  <li>
                    <a href="#career-stage-early"> Select which career stage you are at </a>
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <div ${error ? rawHtml('class="error"') : ''}>
          <fieldset role="group" ${error ? rawHtml('aria-invalid="true" aria-errormessage="career-stage-error"') : ''}>
            <legend>
              <h1>What career stage are you at?</h1>
            </legend>

            ${error
              ? html`
                  <div class="error-message" id="career-stage-error">
                    <span class="visually-hidden">Error:</span>
                    Select which career stage you are at
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="early"
                    id="career-stage-early"
                    ${match(careerStage)
                      .with({ value: { value: 'early' } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Early</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="mid"
                    ${match(careerStage)
                      .with({ value: { value: 'mid' } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Mid</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="late"
                    ${match(careerStage)
                      .with({ value: { value: 'late' } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Late</span>
                </label>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input name="careerStage" type="radio" value="skip" />
                  <span>Prefer not to say</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeCareerStageMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
