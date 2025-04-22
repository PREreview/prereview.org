import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import type { ResearchInterests } from '../research-interests.js'
import { PageResponse } from '../response.js'
import { changeResearchInterestsMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = (researchInterests: Option.Option<ResearchInterests>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'whatResearchInterests')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeResearchInterestsMatch.formatter, {})}" novalidate>
        <h1><label for="research-interests">${translate(locale, 'my-details', 'whatResearchInterests')()}</label></h1>

        <textarea name="researchInterests" id="research-interests" rows="5">
${match(researchInterests)
            .with({ value: { value: P.select() } }, rawHtml)
            .when(Option.isNone, () => '')
            .exhaustive()}</textarea
        >

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeResearchInterestsMatch.formatter, {}),
  })
