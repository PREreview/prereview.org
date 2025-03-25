import { identity, type Option } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import type { CareerStage } from '../career-stage.js'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeCareerStageMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({
  careerStage,
  error = false,
  locale,
}: {
  careerStage: Option.Option<CareerStage>
  error?: boolean
  locale: SupportedLocale
}) =>
  PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText(translate(locale, 'my-details', 'whatCareerStage')({ error: error ? identity : () => '' })),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'my-details', 'back')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeCareerStageMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'my-details', 'thereIsAProblem')()}</h2>
                <ul>
                  <li>
                    <a href="#career-stage-early"
                      >${translate(locale, 'my-details', 'selectCareerStageError')({ error: () => '' })}</a
                    >
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <div ${error ? rawHtml('class="error"') : ''}>
          <fieldset role="group" ${error ? rawHtml('aria-invalid="true" aria-errormessage="career-stage-error"') : ''}>
            <legend>
              <h1>${translate(locale, 'my-details', 'whatCareerStage')({ error: () => '' })}</h1>
            </legend>

            ${error
              ? html`
                  <div class="error-message" id="career-stage-error">
                    ${rawHtml(translate(locale, 'my-details', 'selectCareerStageError')({ error: visuallyHidden }))}
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
                  <span>${translate(locale, 'my-details', 'early')()}</span>
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
                  <span>${translate(locale, 'my-details', 'mid')()}</span>
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
                  <span>${translate(locale, 'my-details', 'late')()}</span>
                </label>
              </li>
              <li>
                <span>${translate(locale, 'my-details', 'or')()}</span>
                <label>
                  <input name="careerStage" type="radio" value="skip" />
                  <span>${translate(locale, 'my-details', 'preferNotToSay')()}</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'my-details', 'saveAndContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeCareerStageMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })

const visuallyHidden = (text: string) => html`<span class="visually-hidden">${text}</span>`.toString()
