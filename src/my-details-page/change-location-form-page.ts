import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import type { Location } from '../location.js'
import { PageResponse } from '../response.js'
import { changeLocationMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = (location: O.Option<Location>) =>
  PageResponse({
    title: plainText`Where are you based?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeLocationMatch.formatter, {})}" novalidate>
        <h1><label for="location">Where are you based?</label></h1>

        <input
          name="location"
          id="location"
          type="text"
          ${match(location)
            .with({ value: { value: P.select() } }, location => html`value="${location}"`)
            .when(O.isNone, () => '')
            .exhaustive()}
        />

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLocationMatch.formatter, {}),
  })
