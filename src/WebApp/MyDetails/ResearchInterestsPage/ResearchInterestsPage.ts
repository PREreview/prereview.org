import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { ResearchInterests } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { PageResponse } from '../../Response/index.ts'

export const ResearchInterestsPage = (researchInterests: Option.Option<ResearchInterests>, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'whatResearchInterests')()),
    nav: html`<a href="${format(Routes.myDetailsMatch.formatter, {})}" class="back"
      >${translate(locale, 'forms', 'backLink')()}</a
    >`,
    main: html`
      <form method="post" action="${Routes.ChangeResearchInterests}" novalidate>
        <h1><label for="research-interests">${translate(locale, 'my-details', 'whatResearchInterests')()}</label></h1>

        <textarea name="researchInterests" id="research-interests" placeholder=" " dir="auto" rows="5">
${match(researchInterests)
  .with({ value: { value: P.select() } }, rawHtml)
  .when(Option.isNone, () => '')
  .exhaustive()}</textarea>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.ChangeResearchInterests,
  })
