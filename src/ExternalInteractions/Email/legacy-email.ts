import { pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import rtlDetect from 'rtl-detect'
import type { Uuid } from 'uuid-ts'
import type { Nodemailer } from '../../ExternalApis/index.ts'
import { html, mjmlToHtml, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type { PreprintTitle } from '../../Preprints/index.ts'
import { type PublicUrlEnv, toUrl } from '../../public-url.ts'
import { authorInviteDeclineMatch, authorInviteMatch } from '../../routes.ts'
import { EmailAddress } from '../../types/EmailAddress.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'

export const createAuthorInviteEmail = (
  person: { name: NonEmptyString; emailAddress: EmailAddress },
  authorInviteId: Uuid,
  newPrereview: { author: string; preprint: PreprintTitle },
  locale: SupportedLocale,
): R.Reader<PublicUrlEnv, Nodemailer.Email> =>
  pipe(
    R.Do,
    R.apS('inviteUrl', toUrl(authorInviteMatch.formatter, { id: authorInviteId })),
    R.apS('declineUrl', toUrl(authorInviteDeclineMatch.formatter, { id: authorInviteId })),
    R.map(
      ({ inviteUrl, declineUrl }) =>
        ({
          from: { address: EmailAddress('help@prereview.org'), name: 'PREreview' },
          to: { address: person.emailAddress, name: person.name },
          subject: translate(locale, 'email', 'beListedAsAuthor')(),
          text: `
${translate(locale, 'email', 'hiName')({ name: person.name })}

${translate(locale, 'email', 'thanksContributingReview')({ preprint: plainText(newPrereview.preprint.title).toString(), prereview: 'PREreview.org' })}

${translate(locale, 'email', 'authorHasInvitedYou')({ author: newPrereview.author })}

${translate(locale, 'email', 'beListedGoingTo')()}

  ${inviteUrl.href}

${translate(locale, 'email', 'chooseNotToBeListedGoingTo')()}

  ${declineUrl.href}

${translate(locale, 'email', 'haveAnyQuestions')({ emailAddress: 'help@prereview.org' })}

${translate(locale, 'email', 'allTheBest')()}
PREreview
`.trim(),
          html: mjmlToHtml(html`
            <mjml lang="${locale}" dir="${rtlDetect.getLangDir(locale)}">
              <mj-head>${mjmlStyle}</mj-head>
              <mj-body>
                <mj-section>
                  <mj-column>
                    <mj-text>${translate(locale, 'email', 'hiName')({ name: person.name })}</mj-text>
                    <mj-text
                      >${rawHtml(
                        translate(
                          locale,
                          'email',
                          'thanksContributingReview',
                        )({
                          preprint: newPrereview.preprint.title.toString(),
                          prereview: html`<a href="https://prereview.org/">PREreview.org</a>`.toString(),
                        }),
                      )}
                    </mj-text>
                    <mj-text
                      >${translate(locale, 'email', 'authorHasInvitedYou')({ author: newPrereview.author })}</mj-text
                    >
                    <mj-button href="${inviteUrl.href}"
                      >${translate(locale, 'email', 'beListedAsAuthorButton')()}</mj-button
                    >
                    <mj-text
                      >${rawHtml(
                        translate(
                          locale,
                          'email',
                          'chooseNotToBeListedLink',
                        )({ link: text => html`<a href="${declineUrl.href}">${text}</a>`.toString() }),
                      )}
                    </mj-text>
                    <mj-text>
                      ${rawHtml(
                        translate(
                          locale,
                          'email',
                          'haveAnyQuestions',
                        )({
                          emailAddress: html`<a href="mailto:help@prereview.org">help@prereview.org</a>`.toString(),
                        }),
                      )}
                    </mj-text>
                    <mj-text>${translate(locale, 'email', 'allTheBest')()}<br />PREreview</mj-text>
                  </mj-column>
                </mj-section>
              </mj-body>
            </mjml>
          `),
        }) satisfies Nodemailer.Email,
    ),
  )

const mjmlStyle = html`
  <mj-attributes>
    <mj-button border="transparent solid"></mj-button>
  </mj-attributes>
`
