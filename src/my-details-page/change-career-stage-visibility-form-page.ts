import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import type { CareerStage } from '../career-stage.ts'
import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import { changeCareerStageVisibilityMatch, myDetailsMatch } from '../routes.ts'

export const createFormPage = ({ careerStage, locale }: { careerStage: CareerStage; locale: SupportedLocale }) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'seeCareerStage')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeCareerStageVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>${translate(locale, 'my-details', 'seeCareerStage')()}</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="careerStageVisibility"
                  id="career-stage-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="career-stage-visibility-tip-public"
                  ${match(careerStage.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'everyone')()}</span>
              </label>
              <p id="career-stage-visibility-tip-public" role="note">
                ${translate(locale, 'my-details', 'showOnPublic')()}
              </p>
            </li>
            <li>
              <label>
                <input
                  name="careerStageVisibility"
                  id="career-stage-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="career-stage-visibility-tip-restricted"
                  ${match(careerStage.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'onlyPrereview')()}</span>
              </label>
              <p id="career-stage-visibility-tip-restricted" role="note">
                ${translate(locale, 'my-details', 'willNotShare')()}
              </p>
            </li>
          </ol>
        </fieldset>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeCareerStageVisibilityMatch.formatter, {}),
  })
