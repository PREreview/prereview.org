import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'

export const failureMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    title: plainText(t('havingProblems')()),
    status: StatusCodes.SERVICE_UNAVAILABLE,
    main: html`
      <h1>${t('havingProblems')()}</h1>

      <p>${t('unableToPublish')()}</p>

      <p>${t('tryAgainLater')()}</p>

      <p>${rawHtml(t('getInTouch')({ contact: mailToHelp }))}</p>
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
