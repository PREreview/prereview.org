import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import * as StatusCodes from '../../../StatusCodes.ts'

export const failureMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    title: plainText(t('havingProblems')()),
    status: StatusCodes.ServiceUnavailable,
    main: html`
      <h1>${t('havingProblems')()}</h1>

      <p>${t('unableToPublish')()}</p>

      <p>${t('tryAgainLater')()}</p>

      <p>${rawHtml(t('getInTouch')({ contact: mailToHelp }))}</p>
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
