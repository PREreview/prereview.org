import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import type { CareerStage } from '../career-stage.js'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'
import { changeCareerStageVisibilityMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({ careerStage }: { careerStage: CareerStage }) =>
  PageResponse({
    title: plainText`Who can see your career stage?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>Back</span></a>`,
    main: html`
      <form method="post" action="${format(changeCareerStageVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your career stage?</h1>
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
                <span>Everyone</span>
              </label>
              <p id="career-stage-visibility-tip-public" role="note">We’ll show it on your public profile.</p>
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
                <span>Only PREreview</span>
              </label>
              <p id="career-stage-visibility-tip-restricted" role="note">We won’t share it with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeCareerStageVisibilityMatch.formatter, {}),
  })
