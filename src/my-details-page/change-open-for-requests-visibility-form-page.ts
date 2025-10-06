import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.ts'
import type { IsOpenForRequests } from '../is-open-for-requests.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import { changeOpenForRequestsVisibilityMatch, myDetailsMatch } from '../routes.ts'

export const createFormPage = ({
  locale,
  openForRequests,
}: {
  locale: SupportedLocale
  openForRequests: Extract<IsOpenForRequests, { value: true }>
}) =>
  PageResponse({
    title: plainText(translate(locale, 'my-details', 'seeHappyTakeRequests')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>${translate(locale, 'my-details', 'seeHappyTakeRequests')()}</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="openForRequestsVisibility"
                  id="open-for-requests-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="open-for-requests-visibility-tip-public"
                  ${match(openForRequests.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'everyone')()}</span>
              </label>
              <p id="open-for-requests-visibility-tip-public" role="note">
                ${translate(locale, 'my-details', 'saySoOnPublic')()}
              </p>
            </li>
            <li>
              <label>
                <input
                  name="openForRequestsVisibility"
                  id="open-for-requests-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="open-for-requests-visibility-tip-restricted"
                  ${match(openForRequests.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>${translate(locale, 'my-details', 'onlyPrereview')()}</span>
              </label>
              <p id="open-for-requests-visibility-tip-restricted" role="note">
                ${translate(locale, 'my-details', 'noOneElseKnow')()}
              </p>
            </li>
          </ol>
        </fieldset>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeOpenForRequestsVisibilityMatch.formatter, {}),
  })
