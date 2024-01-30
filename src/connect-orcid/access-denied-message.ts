import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import { PageResponse } from '../response'

export const accessDeniedMessage = PageResponse({
  status: Status.Forbidden,
  title: plainText`Sorry, we can’t connect your profile`,
  main: html`
    <h1>Sorry, we can’t connect your profile</h1>

    <p>You have denied PREreview access to your ORCID profile.</p>

    <p>Please try again.</p>
  `,
})
