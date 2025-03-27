import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import type { ResearchInterests } from '../research-interests.js'
import { PageResponse } from '../response.js'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from '../routes.js'

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
      ><span>${translate(locale, 'my-details', 'back')()}</span></a
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

        <button>${translate(locale, 'my-details', 'saveAndContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeResearchInterestsVisibilityMatch.formatter, {}),
  })
