import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'

export const removedForNowPage = PageResponse({
  title: plainText`Sorry, we’ve removed this page for now`,
  status: Status.NotFound,
  main: html`
    <h1>Sorry, we’ve removed this page for now</h1>

    <p>We’re making changes to PREreview and have removed this page for now.</p>

    <p>
      If you have any questions or you selected a link or button, please
      <a href="mailto:help@prereview.org">get in touch</a>.
    </p>
  `,
})
