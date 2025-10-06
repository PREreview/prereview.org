import { html, plainText } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import type * as Response from '../Response/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as StatusCodes from '../StatusCodes.ts'

export interface UnableToLoadPrereviews {
  readonly _tag: 'UnableToLoadPrereviews'
}

export const UnableToLoadPrereviews: UnableToLoadPrereviews = {
  _tag: 'UnableToLoadPrereviews',
}

export const toResponse: (
  unableToLoadPrereviews: UnableToLoadPrereviews,
  locale: SupportedLocale,
) => Response.PageResponse = (unableToLoadPrereviews, locale) =>
  PageResponse({
    status: StatusCodes.ServiceUnavailable,
    title: plainText(translate(locale, 'my-prereviews-page', 'havingProblems')()),
    main: html`
      <h1>${translate(locale, 'my-prereviews-page', 'havingProblems')()}</h1>

      <p>${translate(locale, 'my-prereviews-page', 'unableToShow')()}</p>

      <p>${translate(locale, 'my-prereviews-page', 'tryAgainLater')()}</p>
    `,
  })
