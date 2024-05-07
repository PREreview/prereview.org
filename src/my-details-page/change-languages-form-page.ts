import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html'
import type { Languages } from '../languages'
import { PageResponse } from '../response'
import { changeLanguagesMatch, myDetailsMatch } from '../routes'

export const createFormPage = (languages: O.Option<Languages>) =>
  PageResponse({
    title: plainText`What languages can you review in?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeLanguagesMatch.formatter, {})}" novalidate>
        <h1><label for="languages">What languages can you review in?</label></h1>

        <input
          name="languages"
          id="languages"
          type="text"
          ${match(languages)
            .with({ value: { value: P.select() } }, languages => html`value="${languages}"`)
            .when(O.isNone, () => '')
            .exhaustive()}
        />

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesMatch.formatter, {}),
  })
