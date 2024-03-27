import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import { PageResponse } from '../response'
import { myDetailsMatch, removeAvatarMatch } from '../routes'

export const page = PageResponse({
  status: Status.OK,
  title: plainText`Remove your avatar`,
  nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
  main: html`
    <form method="post" action="${format(removeAvatarMatch.formatter, {})}" enctype="multipart/form-data" novalidate>
      <h1>Remove your avatar</h1>

      <p>We’ll remove your avatar from your profile.</p>

      <p>You will be able to upload a new one at any time.</p>

      <button>Remove avatar</button>
    </form>
  `,
  skipToLabel: 'form',
  canonical: format(removeAvatarMatch.formatter, {}),
})
