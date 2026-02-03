import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml } from '../../../html.ts'
import type * as ReviewRequests from '../../../ReviewRequests/index.ts'
import { EmailAddress } from '../../../types/index.ts'

export const CreateEmail = (reviewRequest: ReviewRequests.ReviewRequestToAcknowledge): Nodemailer.Email => ({
  from: { name: 'PREreview', address: EmailAddress.EmailAddress('help@prereview.org') },
  to: { name: reviewRequest.requester.name, address: reviewRequest.requester.emailAddress },
  subject: 'Review requested from the PREreview community',
  html: mjmlToHtml(html`
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Hi ${reviewRequest.requester.name},</mj-text>
            <mj-text>Thank you for requesting a review from PREreview.</mj-text>
            <mj-text>
              While we cannot guarantee a review, we’ve shared your request with our PREreview community on our
              #request-a-review Slack channel.
            </mj-text>
            <mj-text>
              You can join our Slack Community and add further details to your review request by signing up at
              <a href="https://bit.ly/PREreview-Slack">bit.ly/PREreview-Slack</a>.
            </mj-text>
            <mj-text>
              If you have any questions, please let us know at
              <a href="mailto:help@prereview.org">help@prereview.org</a>.
            </mj-text>
            <mj-text>All the best,<br />PREreview</mj-text>
          </mj-column>
        </mj-section>
        <mj-section padding-bottom="0" border-top="1px solid lightgrey">
          <mj-column width="25%" vertical-align="middle">
            <mj-image
              href="https://prereview.org"
              src="https://res.cloudinary.com/prereview/image/upload/f_auto,q_auto,w_300/emails/logo_tbhi5b"
              padding="0"
            />
          </mj-column>
          <mj-column width="75%" vertical-align="middle">
            <mj-text font-size="11px">PREreview is a platform, resource center, and convener.</mj-text>
            <mj-text font-size="11px">
              We provide ways for feedback to preprints to be done openly, rapidly, constructively, and by a global
              community of peers.
            </mj-text>
            <mj-text font-size="11px">
              Join us at <a href="https://prereview.org">prereview.org</a> and
              <a href="https://bit.ly/PREreview-Slack">sign up to our vibrant Slack community</a>.
            </mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  `),
  text: `
Hi ${reviewRequest.requester.name},

Thank you for requesting a review from PREreview.

While we cannot guarantee a review, we’ve shared your request with our PREreview community on our #request-a-review Slack channel.

You can join our Slack Community and add further details to your review request by signing up at https://bit.ly/PREreview-Slack.

If you have any questions, please let us know at help@prereview.org.

All the best,
PREreview

---

PREreview is a platform, resource center, and convener.
We provide ways for feedback to preprints to be done openly, rapidly, constructively, and by a global community of peers.
Join us at https://prereview.org and sign up to our vibrant Slack community at https://bit.ly/PREreview-Slack.
`.trim(),
})
