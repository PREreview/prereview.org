import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import type { Location } from '../location.ts'
import { PageResponse } from '../Response/index.ts'
import { changeLocationMatch, myDetailsMatch } from '../routes.ts'

export const createFormPage = (location: Option.Option<Location>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'whereBased')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeLocationMatch.formatter, {})}" novalidate>
        <h1><label for="location">${translate(locale, 'my-details', 'whereBased')()}</label></h1>

        <input
          name="location"
          id="location"
          type="text"
          ${match(location)
            .with({ value: { value: P.select() } }, location => html`value="${location}"`)
            .when(Option.isNone, () => '')
            .exhaustive()}
        />

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLocationMatch.formatter, {}),
  })
