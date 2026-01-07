import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { ResearchInterests } from '../../research-interests.ts'
import { PageResponse } from '../../Response/index.ts'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from '../../routes.ts'

export const createFormPage = ({
  locale,
  researchInterests,
}: {
  locale: SupportedLocale
  researchInterests: ResearchInterests
}) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'seeWhatResearchInterests')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeResearchInterestsVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>${translate(locale, 'my-details', 'seeWhatResearchInterests')()}</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="researchInterestsVisibility"
                  id="research-interests-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="research-interests-visibility-tip-public"
                  ${match(researchInterests.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'everyone')()}</span>
              </label>
              <p id="research-interests-visibility-tip-public" role="note">
                ${translate(locale, 'my-details', 'showThemOnPublic')()}
              </p>
            </li>
            <li>
              <label>
                <input
                  name="researchInterestsVisibility"
                  id="research-interests-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="research-interests-visibility-tip-restricted"
                  ${match(researchInterests.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'onlyPrereview')()}</span>
              </label>
              <p id="research-interests-visibility-tip-restricted" role="note">
                ${translate(locale, 'my-details', 'willNotShareThem')()}
              </p>
            </li>
          </ol>
        </fieldset>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeResearchInterestsVisibilityMatch.formatter, {}),
  })
