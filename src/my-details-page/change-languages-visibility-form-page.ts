import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { Languages } from '../languages.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../routes.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createFormPage = ({ languages, locale }: { languages: Languages; locale: SupportedLocale }) =>
  PageResponse({
    title: plainText`Who can see your languages?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>Back</span></a>`,
    main: html`
      <form method="post" action="${format(changeLanguagesVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your languages?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="languagesVisibility"
                  id="languages-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="languages-visibility-tip-public"
                  ${match(languages.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="languages-visibility-tip-public" role="note">We’ll show them on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="languagesVisibility"
                  id="languages-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="languages-visibility-tip-restricted"
                  ${match(languages.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="languages-visibility-tip-restricted" role="note">We won’t share them with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesVisibilityMatch.formatter, {}),
  })
