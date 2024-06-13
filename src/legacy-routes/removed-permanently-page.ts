import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'

export const removedPermanentlyPage = PageResponse({
  title: plainText`Sorry, we’ve taken this page down`,
  status: Status.Gone,
  main: html`
    <h1>Sorry, we’ve taken this page down</h1>

    <p>We’re making changes to PREreview and have removed this page.</p>

    <p>
      If you have any questions or you selected a link or button, please
      <a href="mailto:help@prereview.org">get in touch</a>.
    </p>
  `,
})
