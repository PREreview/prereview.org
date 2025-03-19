import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { disconnectSlackMatch } from '../routes.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const disconnectSlackPage = (locale: SupportedLocale) =>
  PageResponse({
    title: plainText`Disconnect your Community Slack Account`,
    main: html`
      <form method="post" action="${format(disconnectSlackMatch.formatter, {})}" novalidate>
        <h1>Disconnect your Community Slack Account</h1>

        <p>You can disconnect your PREreview profile from your account on the PREreview Community Slack.</p>

        <p>We’ll remove your ORCID iD from your Slack profile.</p>

        <p>You will be able to reconnect it at any time.</p>

        <button>Disconnect account</button>
      </form>
    `,
    canonical: format(disconnectSlackMatch.formatter, {}),
  })
