import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { Location } from '../../location.ts'
import { PageResponse } from '../../Response/index.ts'
import { changeLocationVisibilityMatch, myDetailsMatch } from '../../routes.ts'

export const createFormPage = ({ locale, location }: { locale: SupportedLocale; location: Location }) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'seeLocation')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeLocationVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>${translate(locale, 'my-details', 'seeLocation')()}</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="locationVisibility"
                  id="location-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="location-visibility-tip-public"
                  ${match(location.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'everyone')()}</span>
              </label>
              <p id="location-visibility-tip-public" role="note">
                ${translate(locale, 'my-details', 'showOnPublic')()}
              </p>
            </li>
            <li>
              <label>
                <input
                  name="locationVisibility"
                  id="location-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="location-visibility-tip-restricted"
                  ${match(location.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'onlyPrereview')()}</span>
              </label>
              <p id="location-visibility-tip-restricted" role="note">
                ${translate(locale, 'my-details', 'willNotShare')()}
              </p>
            </li>
          </ol>
        </fieldset>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLocationVisibilityMatch.formatter, {}),
  })
