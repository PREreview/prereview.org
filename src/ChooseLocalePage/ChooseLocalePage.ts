import { Array, pipe, String, Tuple } from 'effect'
import { html, plainText } from '../html.js'
import { DefaultLocale, type SupportedLocale, UserSelectableLocales } from '../locales/index.js'
import { PageResponse } from '../response.js'
import * as Routes from '../routes.js'

export const createChooseLocalePage = ({ locale }: { locale: SupportedLocale }) => {
  return PageResponse({
    title: plainText('Choose your language'),
    main: html`
      <h1 class="visually-hidden">Choose your language</h1>

      <div class="menu">
        <div class="locales">
          <h3>Choose your language</h3>
          <ul>
            ${pipe(
              Array.fromIterable(UserSelectableLocales),
              Array.map(supportedLocale =>
                Tuple.make(
                  supportedLocale,
                  new Intl.DisplayNames(supportedLocale, {
                    type: 'language',
                    languageDisplay: 'standard',
                    style: 'short',
                  }).of(supportedLocale) ?? supportedLocale,
                ),
              ),
              Array.sortWith(
                ([, b]) => b,
                (a, b) => String.localeCompare(b, [locale, DefaultLocale], { sensitivity: 'base' })(a),
              ),
              Array.map(
                ([code, name]) => html`
                  <li>
                    <a
                      href="/${code.toLowerCase()}"
                      lang="${code}"
                      hreflang="${code}"
                      ${locale === code ? html`aria-current="true"` : ''}
                      >${name}</a
                    >
                  </li>
                `,
              ),
            )}
          </ul>
        </div>
      </div>
    `,
    canonical: Routes.ChooseLocale,
    current: 'choose-locale',
  })
}
