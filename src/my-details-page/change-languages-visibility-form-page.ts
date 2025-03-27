import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { Languages } from '../languages.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({ languages, locale }: { languages: Languages; locale: SupportedLocale }) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'seeLanguages')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'my-details', 'back')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeLanguagesVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>${translate(locale, 'my-details', 'seeLanguages')()}</h1>
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
                <span>${translate(locale, 'my-details', 'everyone')()}</span>
              </label>
              <p id="languages-visibility-tip-public" role="note">
                ${translate(locale, 'my-details', 'showThemOnPublic')()}
              </p>
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
                <span>${translate(locale, 'my-details', 'onlyPrereview')()}</span>
              </label>
              <p id="languages-visibility-tip-restricted" role="note">
                ${translate(locale, 'my-details', 'willNotShareThem')()}
              </p>
            </li>
          </ol>
        </fieldset>

        <button>${translate(locale, 'my-details', 'saveAndContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesVisibilityMatch.formatter, {}),
  })
