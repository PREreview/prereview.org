import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { Languages } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { PageResponse } from '../../Response/index.ts'

export const LanguagesPage = (languages: Option.Option<Languages>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'whatLanguages')()),
    nav: html`<a href="${format(Routes.myDetailsMatch.formatter, {})}" class="back"
      >${translate(locale, 'forms', 'backLink')()}</a
    >`,
    main: html`
      <form method="post" action="${Routes.ChangeLanguages}" novalidate>
        <h1><label for="languages">${translate(locale, 'my-details', 'whatLanguages')()}</label></h1>

        <input
          name="languages"
          id="languages"
          type="text"
          placeholder=" "
          dir="auto"
          ${match(languages)
            .with({ value: { value: P.select() } }, languages => html`value="${languages}"`)
            .when(Option.isNone, () => '')
            .exhaustive()}
        />

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.ChangeLanguages,
  })
