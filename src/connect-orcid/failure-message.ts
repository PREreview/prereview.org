import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import { PageResponse } from '../response'

export const failureMessage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to connect your profile right now.</p>

    <p>Please try again later.</p>
  `,
})
