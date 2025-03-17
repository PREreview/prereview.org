import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { connectSlackStartMatch } from '../routes.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const connectSlackPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText`Connect your Community Slack Account`,
    main: html`
      <h1>Connect your Community Slack Account</h1>

      <p>You can connect your PREreview profile to your account on the PREreview Community Slack.</p>

      <p>We’ll show your ORCID iD on your Slack profile.</p>

      <h2>Before you start</h2>

      <p>
        You need to have an account on the PREreview Community Slack. If you don’t, fill out the
        <a href="https://bit.ly/PREreview-Slack">registration form</a> to create one.
      </p>

      <p>
        We’ll send you to Slack, where they will ask you to log in to the PREreview Community Slack and grant PREreview
        access to your account there. You may have already done these steps, and Slack will return you to PREreview.
      </p>

      <a href="${format(connectSlackStartMatch.formatter, {})}" role="button" draggable="false">Start now</a>
    `,
  })
