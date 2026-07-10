import { Effect } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { type Html, html, mjmlToHtml, plainText } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { DefaultLocale, getLocaleForLanguage, isUserSelectableLanguage, translate } from '../../../locales/index.ts'
import { forRoute, type PublicUrl } from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { EmailAddress, type Name, type Uuid } from '../../../types/index.ts'

export const CreateEmail: (details: {
  invitationId: Uuid.Uuid
  inviter: Name.Name
  invitee: { name: Name.Name; emailAddress: EmailAddress.EmailAddress }
  subject: {
    language: LanguageCode
    title: Html
  }
}) => Effect.Effect<Nodemailer.Email, never, PublicUrl> = Effect.fnUntraced(function* ({
  invitationId,
  inviter,
  invitee,
  subject,
}) {
  const locale = isUserSelectableLanguage(subject.language) ? getLocaleForLanguage(subject.language) : DefaultLocale

  const t = translate(locale, 'email')

  const inviteUrl = yield* forRoute(Routes.AuthorInviteStartNow, { invitationId })
  const homePage = yield* forRoute(Routes.HomePage)

  return {
    from: { address: EmailAddress.EmailAddress('help@prereview.org'), name: 'PREreview' },
    to: { address: invitee.emailAddress, name: invitee.name },
    subject: plainText(t('beListedAsAuthor')()).toString(),
    html: yield* mjmlToHtml(html`
      <mjml ${languageAttributesFor(locale)}>
        <mj-head>
          <mj-attributes>
            <mj-button border="transparent solid"></mj-button>
          </mj-attributes>
        </mj-head>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>${t('hiName')({ name: invitee.name })}</mj-text>
              <mj-text
                >${t('thanksContributingReview')({
                  preprint: html`<span ${languageAttributesFor(subject.language)}>${subject.title}</span>`,
                  prereview: html`<a href="${homePage.href}">PREreview</a>`,
                })}
              </mj-text>
              <mj-text>${t('authorHasInvitedYou')({ author: inviter })}</mj-text>
              <mj-button href="${inviteUrl.href}">${t('beListedAsAuthorButton')()}</mj-button>
              <mj-text>${t('chooseNotToBeListedIgnoring')()}</mj-text>
              <mj-text>
                ${t('haveAnyQuestions')({
                  emailAddress: html`<a href="mailto:help@prereview.org">help@prereview.org</a>`,
                })}
              </mj-text>
              <mj-text>${t('allTheBest')()}<br />PREreview</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `),
    text: plainText`
${t('hiName')({ name: invitee.name })}

${t('thanksContributingReview')({
  preprint: subject.title,
  prereview: 'PREreview',
})}

${t('authorHasInvitedYou')({ author: inviter })}

${t('beListedGoingTo')()}

  ${inviteUrl.href}

${t('chooseNotToBeListedIgnoring')()}

${t('haveAnyQuestions')({ emailAddress: 'help@prereview.org' })}

${t('allTheBest')()}
PREreview
`
      .toString()
      .trim(),
  }
})
