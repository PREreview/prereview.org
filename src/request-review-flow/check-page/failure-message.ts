import { pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import { StreamlinePageResponse } from '../../response.ts'
import * as StatusCodes from '../../StatusCodes.ts'

const mailtoHelp = (text: string) => `<a href="mailto:help@prereview.org">${text}</a>`

export const failureMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: pipe(t('sorryWeAreHavingProblems')(), plainText),
    main: html`
      <h1>${t('sorryWeAreHavingProblems')()}</h1>

      <p>${t('unableToPublishYourWorkWasSaved')()}</p>

      <p>${t('pleaseTryAgainLater')()}</p>

      <p>${rawHtml(t('ifProblemPersistsContactUs')({ mailtoHelp }))}</p>
    `,
  })
}
