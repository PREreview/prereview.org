import { Status } from 'hyper-ts'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'

export const failureMessage = StreamlinePageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We were unable to add your name to the PREreview. We saved your work.</p>

    <p>Please try again later by coming back to this page.</p>

    <p>If this problem persists, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
  `,
})
