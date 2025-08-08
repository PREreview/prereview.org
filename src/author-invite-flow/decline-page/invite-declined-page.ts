import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { Uuid } from 'uuid-ts'
import { html, plainText } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { authorInviteDeclineMatch } from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'

export const inviteDeclinedPage = (locale: SupportedLocale, inviteId: Uuid) => {
  const t = translate(locale, 'author-invite-flow')
  return StreamlinePageResponse({
    status: StatusCodes.OK,
    title: pipe(t('invitationDeclined')(), plainText),
    main: html`
      <h1>${t('invitationDeclined')()}</h1>

      <p>${t('youHaveDeclinedToAppearAsAuthor')()}</p>

      <p>${t('youCanCloseThisWindow')()}</p>
    `,
    canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
    allowRobots: false,
  })
}
