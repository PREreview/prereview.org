import { Effect, Option } from 'effect'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml, plainText } from '../../../html.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import { forRoute, type PublicUrl } from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { EmailAddress, type Name } from '../../../types/index.ts'

export interface Requester {
  readonly name: Option.Option<Name.Name>
  readonly emailAddress: EmailAddress.EmailAddress
}

export interface Review {
  readonly author: Option.Option<Name.Name>
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
    to: Option.match(requester.name, {
      onSome: name => ({ name, address: requester.emailAddress }),
      onNone: () => requester.emailAddress,
    }),
    subject: 'Review published on PREreview',
    html: yield* mjmlToHtml(html`
      <mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text
                >${Option.match(requester.name, {
                  onSome: name => html`Hi ${name},`,
                  onNone: () => 'Hi,',
                })}</mj-text
              >
              <mj-text
                >${Option.match(review.author, {
                  onSome: author => html`${author} has published a review of “${review.preprint.title}” on PREreview.`,
                  onNone: () => html`A review of “${review.preprint.title}” has been published on PREreview.`,
                })}</mj-text
              >
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
${Option.match(requester.name, {
  onSome: name => `Hi ${name},`,
  onNone: () => 'Hi,',
})}

${Option.match(review.author, {
  onSome: author =>
    `${author} has published a review of “${plainText(review.preprint.title).toString()}” on PREreview.`,
  onNone: () => `A review of “${plainText(review.preprint.title).toString()}” has been published on PREreview.`,
})}

You can read the review by going to:

  ${reviewUrl.href}

If you have any questions, please let us know at help@prereview.org.

All the best,
PREreview
`.trim(),
  }
})
