import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { connectSlackStartMatch } from '../routes.js'

export const connectSlackPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'connect-slack-page', 'connectYourAccount')()),
    main: html`
      <h1>${translate(locale, 'connect-slack-page', 'connectYourAccount')()}</h1>

      <p>${translate(locale, 'connect-slack-page', 'youCanConnect')()}</p>

      <p>${translate(locale, 'connect-slack-page', 'showOrcidOnProfile')()}</p>

      <h2>${translate(locale, 'connect-slack-page', 'beforeYouStart')()}</h2>

      <p>
        ${rawHtml(
          translate(
            locale,
            'connect-slack-page',
            'needSlackAccount',
          )({ link: text => html`<a href="https://bit.ly/PREreview-Slack">${text}</a>`.toString() }),
        )}
      </p>

      <p>${translate(locale, 'connect-slack-page', 'sendYouToSlack')()}</p>

      <a href="${format(connectSlackStartMatch.formatter, {})}" role="button" draggable="false"
        >${translate(locale, 'connect-slack-page', 'startNow')()}</a
      >
    `,
  })
