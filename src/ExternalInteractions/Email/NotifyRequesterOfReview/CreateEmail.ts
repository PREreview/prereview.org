import { Effect } from 'effect'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml, plainText } from '../../../html.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import { forRoute, type PublicUrl } from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { EmailAddress, type Name } from '../../../types/index.ts'

export interface Requester {
  readonly name: Name.Name
  readonly emailAddress: EmailAddress.EmailAddress
}

export interface Review {
  readonly author: Name.Name
  readonly id: number
  readonly preprint: Preprints.PreprintTitle
}

export const CreateEmail: (details: {
  requester: Requester
  review: Review
}) => Effect.Effect<Nodemailer.Email, never, PublicUrl> = Effect.fnUntraced(function* ({ requester, review }) {
  const reviewUrl = yield* forRoute(Routes.reviewMatch.formatter, { id: review.id })

  return {
    from: { name: 'PREreview', address: EmailAddress.EmailAddress('help@prereview.org') },
    to: { name: requester.name, address: requester.emailAddress },
    subject: 'Review published on PREreview',
    html: yield* mjmlToHtml(html`
      <mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>Hi ${requester.name},</mj-text>
              <mj-text>${review.author} has published a review of “${review.preprint.title}” on PREreview.</mj-text>
              <mj-button href="${reviewUrl.href}">Read the review</mj-button>
              <mj-text
                >If you have any questions, please let us know at
                <a href="mailto:help@prereview.org">help@prereview.org</a>.</mj-text
              >
              <mj-text>All the best,<br />PREreview</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `),
    text: `
Hi ${requester.name},

${review.author} has published a review of “${plainText(review.preprint.title).toString()}” on PREreview.

You can read the review by going to:

  ${reviewUrl.href}

If you have any questions, please let us know at help@prereview.org.

All the best,
PREreview
`.trim(),
  }
})
