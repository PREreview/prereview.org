import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import type { Location } from '../location.js'
import { PageResponse } from '../response.js'
import { changeLocationMatch, myDetailsMatch } from '../routes.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createFormPage = (location: Option.Option<Location>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText`Where are you based?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>Back</span></a>`,
    main: html`
      <form method="post" action="${format(changeLocationMatch.formatter, {})}" novalidate>
        <h1><label for="location">Where are you based?</label></h1>

        <input
          name="location"
          id="location"
          type="text"
          ${match(location)
            .with({ value: { value: P.select() } }, location => html`value="${location}"`)
            .when(Option.isNone, () => '')
            .exhaustive()}
        />

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLocationMatch.formatter, {}),
  })
