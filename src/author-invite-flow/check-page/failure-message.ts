import { pipe } from 'effect'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'

const mailToHelpLink = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()

export const failureMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'author-invite-flow')
  return StreamlinePageResponse({
    status: Status.ServiceUnavailable,
    title: pipe(t('sorryHavingProblems')(), plainText),
    main: html`
      <h1>${t('sorryHavingProblems')()}</h1>

      <p>${t('unableToAddYourNameWorkHasBeenSaved')()}</p>

      <p>${t('comeBackLater')()}</p>

      <p>${pipe(t('getInTouch')({ link: mailToHelpLink }), rawHtml)}</p>
    `,
  })
}
