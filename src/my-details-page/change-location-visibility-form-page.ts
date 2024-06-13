import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { Location } from '../location.js'
import { PageResponse } from '../response.js'
import { changeLocationVisibilityMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({ location }: { location: Location }) =>
  PageResponse({
    title: plainText`Who can see your location?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeLocationVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your location?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="locationVisibility"
                  id="location-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="location-visibility-tip-public"
                  ${match(location.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="location-visibility-tip-public" role="note">We’ll show it on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="locationVisibility"
                  id="location-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="location-visibility-tip-restricted"
                  ${match(location.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="location-visibility-tip-restricted" role="note">We won’t share it with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLocationVisibilityMatch.formatter, {}),
  })
