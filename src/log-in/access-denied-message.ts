import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import { PageResponse } from '../response'

export const accessDeniedMessage = PageResponse({
  title: plainText`Sorry, we can’t log you in`,
  status: Status.Forbidden,
  main: html`
    <h1>Sorry, we can’t log you in</h1>

    <p>You have denied PREreview access to your ORCID&nbsp;iD.</p>

    <p>Please try again.</p>
  `,
})
