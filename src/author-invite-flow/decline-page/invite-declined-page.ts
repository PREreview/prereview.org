import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import type { Uuid } from 'uuid-ts'
import { html, plainText } from '../../html.js'
import type { SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { authorInviteDeclineMatch } from '../../routes.js'

export const inviteDeclinedPage = (locale: SupportedLocale, inviteId: Uuid) =>
  StreamlinePageResponse({
    status: Status.OK,
    title: plainText`Invitation declined`,
    main: html`
      <h1>Invitation declined</h1>

      <p>You’ve declined to appear as an author on this PREreview.</p>

      <p>You can close this window.</p>
    `,
    canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
    allowRobots: false,
  })
