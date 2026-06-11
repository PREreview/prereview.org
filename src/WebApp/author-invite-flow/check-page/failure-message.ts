import { pipe } from 'effect'
import { html, plainText, type Html } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

const mailToHelpLink = (text: Html) => html`<a href="mailto:help@prereview.org">${text}</a>`

export const failureMessage = (locale: SupportedLocale) => {
  const t = translate(locale, 'author-invite-flow')
  return StreamlinePageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: pipe(t('sorryHavingProblems')(), plainText),
    main: html`
      <h1>${t('sorryHavingProblems')()}</h1>

      <p>${t('unableToAddYourNameWorkHasBeenSaved')()}</p>

      <p>${t('comeBackLater')()}</p>

      <p>${t('getInTouch')({ link: mailToHelpLink })}</p>
    `,
  })
}
