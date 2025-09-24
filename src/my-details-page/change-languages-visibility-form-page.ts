import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.ts'
import type { Languages } from '../languages.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../routes.ts'

export const createFormPage = ({ languages, locale }: { languages: Languages; locale: SupportedLocale }) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'seeLanguages')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesVisibilityMatch.formatter, {}),
  })
