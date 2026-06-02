import { Array, type HashSet, pipe, String, Tuple } from 'effect'
import { html, plainText } from '../../html.ts'
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
      <h1 class="visually-hidden">${t('chooseLanguage')()}</h1>

      <div class="menu">
        <div class="locales">
          <h3>${t('chooseLanguage')()}</h3>
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
