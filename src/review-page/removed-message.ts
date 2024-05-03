import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import { PageResponse } from '../response'

export const removedMessage = PageResponse({
  status: Status.Gone,
  title: plainText`PREreview removed`,
  main: html`
    <h1>PREreview removed</h1>

    <p>We’ve removed this PREreview.</p>
  `,
})
