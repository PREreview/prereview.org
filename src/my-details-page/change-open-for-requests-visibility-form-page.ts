import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { IsOpenForRequests } from '../is-open-for-requests.js'
import { PageResponse } from '../response.js'
import { changeOpenForRequestsVisibilityMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({ openForRequests }: { openForRequests: Extract<IsOpenForRequests, { value: true }> }) =>
  PageResponse({
    title: plainText`Who can see if you are open for review requests?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see if you are open for review requests?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="openForRequestsVisibility"
                  id="open-for-requests-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="open-for-requests-visibility-tip-public"
                  ${match(openForRequests.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="open-for-requests-visibility-tip-public" role="note">We’ll say so on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="openForRequestsVisibility"
                  id="open-for-requests-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="open-for-requests-visibility-tip-restricted"
                  ${match(openForRequests.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="open-for-requests-visibility-tip-restricted" role="note">We won’t let anyone else know.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeOpenForRequestsVisibilityMatch.formatter, {}),
  })
