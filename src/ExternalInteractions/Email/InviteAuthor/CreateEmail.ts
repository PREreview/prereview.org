import { Effect } from 'effect'
import rtlDetect from 'rtl-detect'
import { Locale } from '../../../Context.ts'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml, plainText, rawHtml } from '../../../html.ts'
import { translate } from '../../../locales/index.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import { forRoute, type PublicUrl } from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { EmailAddress, type NonEmptyString, type Uuid } from '../../../types/index.ts'

export const CreateEmail: (details: {
  person: { name: NonEmptyString.NonEmptyString; emailAddress: EmailAddress.EmailAddress }
  authorInviteId: Uuid.Uuid
  newPrereview: { author: string; preprint: Preprints.PreprintTitle }
}) => Effect.Effect<Nodemailer.Email, never, Locale | PublicUrl> = Effect.fnUntraced(function* ({
  person,
  authorInviteId,
  newPrereview,
}) {
  const locale = yield* Locale

  const t = translate(locale, 'email')

  const inviteUrl = yield* forRoute(Routes.authorInviteMatch.formatter, { id: authorInviteId })
  const declineUrl = yield* forRoute(Routes.authorInviteDeclineMatch.formatter, { id: authorInviteId })

  return {
    from: { address: EmailAddress.EmailAddress('help@prereview.org'), name: 'PREreview' },
    to: { address: person.emailAddress, name: person.name },
    subject: t('beListedAsAuthor')(),
    html: mjmlToHtml(html`
      <mjml lang="${locale}" dir="${rtlDetect.getLangDir(locale)}">
        <mj-head>
          <mj-attributes>
            <mj-button border="transparent solid"></mj-button>
          </mj-attributes>
        </mj-head>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>${t('hiName')({ name: person.name })}</mj-text>
              <mj-text
                >${rawHtml(
                  t('thanksContributingReview')({
                    preprint: newPrereview.preprint.title.toString(),
                    prereview: html`<a href="https://prereview.org/">PREreview.org</a>`.toString(),
                  }),
                )}
              </mj-text>
              <mj-text>${t('authorHasInvitedYou')({ author: newPrereview.author })}</mj-text>
              <mj-button href="${inviteUrl.href}">${t('beListedAsAuthorButton')()}</mj-button>
              <mj-text
                >${rawHtml(
                  t('chooseNotToBeListedLink')({
                    link: text => html`<a href="${declineUrl.href}">${text}</a>`.toString(),
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
        </mj-body>
      </mjml>
    `),
    text: `
${t('hiName')({ name: person.name })}

${t('thanksContributingReview')({ preprint: plainText(newPrereview.preprint.title).toString(), prereview: 'PREreview.org' })}

${t('authorHasInvitedYou')({ author: newPrereview.author })}

${t('beListedGoingTo')()}

  ${inviteUrl.href}

${t('chooseNotToBeListedGoingTo')()}

  ${declineUrl.href}

${t('haveAnyQuestions')({ emailAddress: 'help@prereview.org' })}

${t('allTheBest')()}
PREreview
`.trim(),
  }
})
