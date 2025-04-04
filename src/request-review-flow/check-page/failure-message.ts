import { pipe } from 'effect'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'

const mailtoHelp = (text: string) => `<a href="mailto:help@prereview.org">${text}</a>`

export const failureMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    status: Status.ServiceUnavailable,
    title: pipe(t('sorryWeAreHavingProblems')(), plainText),
    main: html`
      <h1>${t('sorryWeAreHavingProblems')()}</h1>

      <p>${t('unableToPublishYourWorkWasSaved')()}</p>

      <p>${t('pleaseTryAgainLater')()}</p>

      <p>${rawHtml(t('ifProblemPersistsContactUs')({ mailtoHelp }))}</p>
    `,
  })
}
