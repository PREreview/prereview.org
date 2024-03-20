import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'

export const connectFailureMessage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to connect your profile right now.</p>

    <p>Please try again later.</p>
  `,
})

export const disconnectFailureMessage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to disconnect your profile right now.</p>

    <p>Please try again later.</p>
  `,
})
