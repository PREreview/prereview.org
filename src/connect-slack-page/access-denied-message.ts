import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'

export const accessDeniedMessage = PageResponse({
  title: plainText`Sorry, we can’t connect your account`,
  status: Status.Forbidden,
  main: html`
    <h1>Sorry, we can’t connect your account</h1>

    <p>You have denied PREreview access to your Community Slack account.</p>

    <p>Please try again.</p>
  `,
})
