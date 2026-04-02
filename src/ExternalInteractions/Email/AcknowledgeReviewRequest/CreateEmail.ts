import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml, rawHtml } from '../../../html.ts'
import { DefaultLocale, translate } from '../../../locales/index.ts'
import type * as ReviewRequests from '../../../ReviewRequests/index.ts'
import { EmailAddress } from '../../../types/index.ts'

export const CreateEmail = (reviewRequest: ReviewRequests.ReviewRequestToAcknowledge): Nodemailer.Email => {
  const t = translate(DefaultLocale, 'email')

  return {
    from: { name: 'PREreview', address: EmailAddress.EmailAddress('help@prereview.org') },
    to: { name: reviewRequest.requester.name, address: reviewRequest.requester.emailAddress },
    subject: t('acknowledgeReviewRequestTitle')(),
    html: mjmlToHtml(html`
      <mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>${t('hiName')({ name: reviewRequest.requester.name })}</mj-text>
              <mj-text>${t('thanksReviewRequest')()}</mj-text>
              <mj-text>${t('reviewRequestSharedWithCommunity')({ slackChannel: '#request-a-review' })}</mj-text>
              <mj-text>
                ${rawHtml(
                  t('reviewRequestSlackCommunity')({
                    slackLink: html`<a href="https://bit.ly/PREreview-Slack">bit.ly/PREreview-Slack</a>`.toString(),
                  }),
                )}
              </mj-text>
              <mj-text>
                ${rawHtml(
                  t('haveAnyQuestions')({
                    emailAddress: html`<a href="mailto:help@prereview.org">help@prereview.org</a>`.toString(),
                  }),
                )}
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
                >${rawHtml(
                  t('footerJoinHtml')({
                    prereviewLink: text => html`<a href="https://prereview.org">${text}</a>`.toString(),
                    slackLink: text => html`<a href="https://bit.ly/PREreview-Slack">${text}</a>`.toString(),
                  }),
                )}</mj-text
              >
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `),
    text: `
${t('hiName')({ name: reviewRequest.requester.name })}

${t('thanksReviewRequest')()}

${t('reviewRequestSharedWithCommunity')({ slackChannel: '#request-a-review' })}

${t('reviewRequestSlackCommunity')({ slackLink: 'https://bit.ly/PREreview-Slack' })}

${t('haveAnyQuestions')({ emailAddress: 'help@prereview.org' })}

${t('allTheBest')()}
PREreview

---

${t('footerIntro')()}
${t('footerCommunity')()}
${t('footerJoinText')({ prereviewLink: 'https://prereview.org', slackLink: 'https://bit.ly/PREreview-Slack' })}
`.trim(),
  }
}
