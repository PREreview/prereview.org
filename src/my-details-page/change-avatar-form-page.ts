import { format } from 'fp-ts-routing'
import { html, plainText } from '../html'
import { PageResponse } from '../response'
import { changeAvatarMatch, myDetailsMatch } from '../routes'

export function createPage() {
  return PageResponse({
    title: plainText`Upload an avatar`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeAvatarMatch.formatter, {})}" enctype="multipart/form-data" novalidate>
        <h1><label for="avatar">Upload an avatar</label></h1>

        <input name="avatar" id="avatar" type="file" accept="image/*" />

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeAvatarMatch.formatter, {}),
  })
}
