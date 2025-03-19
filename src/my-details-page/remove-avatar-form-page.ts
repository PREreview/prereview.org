import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { myDetailsMatch, removeAvatarMatch } from '../routes.js'

export const page = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.OK,
    title: plainText(translate(locale, 'my-details', 'removeYourAvatar')()),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'my-details', 'back')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(removeAvatarMatch.formatter, {})}" enctype="multipart/form-data" novalidate>
        <h1>${translate(locale, 'my-details', 'removeYourAvatar')()}</h1>

        <p>${translate(locale, 'my-details', 'removeAvatarFromProfile')()}</p>

        <p>${translate(locale, 'my-details', 'canUploadNewOne')()}</p>

        <button>${translate(locale, 'my-details', 'removeAvatarButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(removeAvatarMatch.formatter, {}),
  })
