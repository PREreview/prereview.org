import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { ResearchInterests } from '../research-interests.js'
import { PageResponse } from '../response.js'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({ researchInterests }: { researchInterests: ResearchInterests }) =>
  PageResponse({
    title: plainText`Who can see your research interests?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>Back</span></a>`,
    main: html`
      <form method="post" action="${format(changeResearchInterestsVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your research interests?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="researchInterestsVisibility"
                  id="research-interests-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="research-interests-visibility-tip-public"
                  ${match(researchInterests.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="research-interests-visibility-tip-public" role="note">We’ll show them on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="researchInterestsVisibility"
                  id="research-interests-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="research-interests-visibility-tip-restricted"
                  ${match(researchInterests.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="research-interests-visibility-tip-restricted" role="note">We won’t share them with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeResearchInterestsVisibilityMatch.formatter, {}),
  })
