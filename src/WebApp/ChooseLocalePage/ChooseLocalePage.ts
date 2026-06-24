import { Array, type HashSet, pipe, String, Tuple } from 'effect'
import { html, plainText } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { DefaultLocale, type SupportedLocale, translate, type UserSelectableLocale } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'
import { PageResponse } from '../Response/index.ts'

export const createChooseLocalePage = ({
  locale,
  enabledLocales,
}: {
  locale: SupportedLocale
  enabledLocales: HashSet.HashSet<UserSelectableLocale>
}) => {
  const t = translate(locale, 'header')

  return PageResponse({
    title: plainText(t('chooseLanguage')()),
    main: html`
      <div class="menu">
        <div class="locales">
          <h1>${t('chooseLanguage')()}</h1>
          <ul>
            ${pipe(
              Array.fromIterable(enabledLocales),
              Array.map(enabledLocale =>
                Tuple.make(
                  enabledLocale,
                  new Intl.DisplayNames(enabledLocale, {
                    type: 'language',
                    languageDisplay: 'standard',
                    style: 'short',
                  }).of(enabledLocale) ?? enabledLocale,
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
                      ${languageAttributesFor(code)}
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
