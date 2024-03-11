import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import type { Uuid } from 'uuid-ts'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { authorInviteDeclineMatch } from '../../routes'

export const declinePage = (inviteId: Uuid) =>
  StreamlinePageResponse({
    status: Status.OK,
    title: plainText`Decline the invitation`,
    main: html`
      <form method="post" action="${format(authorInviteDeclineMatch.formatter, { id: inviteId })}" novalidate>
        <h1>Decline the invitation</h1>

        <p>You’ve been invited to appear as an author on a PREreview.</p>

        <button>Decline the invitation</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
  })
