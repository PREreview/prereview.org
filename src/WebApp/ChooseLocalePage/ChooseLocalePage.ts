import { Array, pipe, String, Tuple } from 'effect'
import { html, plainText } from '../../html.ts'
import { DefaultLocale, type SupportedLocale, translate, UserSelectableLocales } from '../../locales/index.ts'
import { PageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'

export const createChooseLocalePage = ({ locale }: { locale: SupportedLocale }) => {
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
