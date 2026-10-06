import { Effect } from 'effect'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml, plainText } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { DefaultLocale, translate } from '../../../locales/index.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import type * as ReviewRequests from '../../../ReviewRequests/index.ts'
import { EmailAddress } from '../../../types/index.ts'

export type ReviewRequest = Omit<ReviewRequests.ReviewRequestToAcknowledge, 'preprintId'> & {
  readonly preprint: Preprints.PreprintTitle
}

export const CreateEmail: (reviewRequest: ReviewRequest) => Effect.Effect<Nodemailer.Email> = Effect.fnUntraced(
  function* (reviewRequest) {
    const t = translate(DefaultLocale, 'email')

    return {
      from: { name: 'PREreview', address: EmailAddress.EmailAddress('help@prereview.org') },
      to: { name: reviewRequest.requester.name, address: reviewRequest.requester.emailAddress },
      subject: plainText(t('acknowledgeReviewRequestTitle')()).toString(),
      html: yield* mjmlToHtml(html`
        <mjml>
          <mj-head>
            <mj-style inline="inline"> cite { font-style: normal; } </mj-style>
          </mj-head>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>${t('hiName')({ name: reviewRequest.requester.name })}</mj-text>
                <mj-text
                  >${t('thanksReviewRequest')({
                    preprintTitle: html`<cite ${languageAttributesFor(reviewRequest.preprint.language)}
                      >${reviewRequest.preprint.title}</cite
                    >`,
                  })}</mj-text
                >
                <mj-text>${t('reviewRequestSharedWithCommunity')({ slackChannel: '#request-a-review' })}</mj-text>
                <mj-text>
                  ${t('reviewRequestSlackCommunity')({
                    slackLink: html`<a href="https://bit.ly/PREreview-Slack">bit.ly/PREreview-Slack</a>`,
                  })}
                </mj-text>
                <mj-text>
                  ${t('haveAnyQuestions')({
                    emailAddress: html`<a href="mailto:help@prereview.org">help@prereview.org</a>`,
                  })}
                </mj-text>
                <mj-text>${t('allTheBest')()}<br />PREreview</mj-text>
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
                <mj-text font-size="11px">${t('footerIntro')()}</mj-text>
                <mj-text font-size="11px">${t('footerCommunity')()}</mj-text>
                <mj-text font-size="11px"
                  >${t('footerJoinHtml')({
                    prereviewLink: text => html`<a href="https://prereview.org">${text}</a>`,
                    slackLink: text => html`<a href="https://bit.ly/PREreview-Slack">${text}</a>`,
                  })}</mj-text
                >
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `),
      text: plainText`
${t('hiName')({ name: reviewRequest.requester.name })}

${t('thanksReviewRequest')({ preprintTitle: reviewRequest.preprint.title })}

${t('reviewRequestSharedWithCommunity')({ slackChannel: '#request-a-review' })}

${t('reviewRequestSlackCommunity')({ slackLink: 'https://bit.ly/PREreview-Slack' })}

${t('haveAnyQuestions')({ emailAddress: 'help@prereview.org' })}

${t('allTheBest')()}
PREreview

---

${t('footerIntro')()}
${t('footerCommunity')()}
${t('footerJoinText')({ prereviewLink: 'https://prereview.org', slackLink: 'https://bit.ly/PREreview-Slack' })}
`
        .toString()
        .trim(),
    }
  },
)
