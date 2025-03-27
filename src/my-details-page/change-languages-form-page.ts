import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { Languages } from '../languages.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeLanguagesMatch, myDetailsMatch } from '../routes.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createFormPage = (languages: Option.Option<Languages>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText`What languages can you review in?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>Back</span></a>`,
    main: html`
      <form method="post" action="${format(changeLanguagesMatch.formatter, {})}" novalidate>
        <h1><label for="languages">What languages can you review in?</label></h1>

        <input
          name="languages"
          id="languages"
          type="text"
          ${match(languages)
            .with({ value: { value: P.select() } }, languages => html`value="${languages}"`)
            .when(Option.isNone, () => '')
            .exhaustive()}
        />

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesMatch.formatter, {}),
  })
