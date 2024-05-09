import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import type * as Response from '../response'
import { PageResponse } from '../response'

export interface UnableToLoadPrereviews {
  readonly _tag: 'UnableToLoadPrereviews'
}

export const UnableToLoadPrereviews: UnableToLoadPrereviews = {
  _tag: 'UnableToLoadPrereviews',
}

export const toResponse: (unableToLoadPrereviews: UnableToLoadPrereviews) => Response.PageResponse = () =>
  PageResponse({
    status: Status.ServiceUnavailable,
    title: plainText`Sorry, we’re having problems`,
    main: html`
      <h1>Sorry, we’re having problems</h1>

      <p>We’re unable to show your PREreviews now.</p>

      <p>Please try again later.</p>
    `,
  })
