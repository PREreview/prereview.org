import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { Languages } from '../languages.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeLanguagesMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = (languages: Option.Option<Languages>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'whatLanguages')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'my-details', 'back')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeLanguagesMatch.formatter, {})}" novalidate>
        <h1><label for="languages">${translate(locale, 'my-details', 'whatLanguages')()}</label></h1>

        <input
          name="languages"
          id="languages"
          type="text"
          ${match(languages)
            .with({ value: { value: P.select() } }, languages => html`value="${languages}"`)
            .when(Option.isNone, () => '')
            .exhaustive()}
        />

        <button>${translate(locale, 'my-details', 'saveAndContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesMatch.formatter, {}),
  })
