import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../html'
import type { ResearchInterests } from '../research-interests'
import { PageResponse } from '../response'
import { changeResearchInterestsMatch, myDetailsMatch } from '../routes'

export const createFormPage = (researchInterests: O.Option<ResearchInterests>) =>
  PageResponse({
    title: plainText`What are your research interests?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeResearchInterestsMatch.formatter, {})}" novalidate>
        <h1><label for="research-interests">What are your research interests?</label></h1>

        <textarea name="researchInterests" id="research-interests" rows="5">
${match(researchInterests)
            .with({ value: { value: P.select() } }, rawHtml)
            .when(O.isNone, () => '')
            .exhaustive()}</textarea
        >

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeResearchInterestsMatch.formatter, {}),
  })
