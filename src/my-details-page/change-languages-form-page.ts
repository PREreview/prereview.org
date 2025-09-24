import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html.ts'
import type { Languages } from '../languages.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import { PageResponse } from '../response.ts'
import { changeLanguagesMatch, myDetailsMatch } from '../routes.ts'

export const createFormPage = (languages: Option.Option<Languages>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'whatLanguages')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesMatch.formatter, {}),
  })
