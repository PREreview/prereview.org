import { format } from 'fp-ts-routing'
import { html, plainText } from '../html'
import { PageResponse } from '../response'
import { connectOrcidMatch, connectOrcidStartMatch } from '../routes'

export const connectOrcidPage = PageResponse({
  title: plainText`Connect your ORCID profile`,
  main: html`
    <h1>Connect your ORCID profile</h1>

    <p>You can connect your PREreview profile to your ORCID profile.</p>

    <p>We’ll add your PREreviews to your ORCID profile.</p>

    <h2>Before you start</h2>

    <p>
      We’ll send you to ORCID, where they will ask you to log in and grant PREreview access to your profile there. You
      may have already done these steps, and ORCID will return you to PREreview.
    </p>

    <a href="${format(connectOrcidStartMatch.formatter, {})}" role="button" draggable="false">Start now</a>
  `,
  canonical: format(connectOrcidMatch.formatter, {}),
})
