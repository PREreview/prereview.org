import { format } from 'fp-ts-routing'
import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const RemoveAvatarPage = (locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.OK,
    title: plainText(translate(locale, 'my-details', 'removeYourAvatar')()),
    nav: html`<a href="${format(Routes.myDetailsMatch.formatter, {})}" class="back"
      >${translate(locale, 'forms', 'backLink')()}</a
    >`,
    main: html`
      <form method="post" action="${Routes.RemoveAvatar}" enctype="multipart/form-data" novalidate>
        <h1>${translate(locale, 'my-details', 'removeYourAvatar')()}</h1>

        <p>${translate(locale, 'my-details', 'removeAvatarFromProfile')()}</p>

        <p>${translate(locale, 'my-details', 'canUploadNewOne')()}</p>

        <button>${translate(locale, 'my-details', 'removeAvatarButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.RemoveAvatar,
  })
