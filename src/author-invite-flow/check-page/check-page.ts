import { format } from 'fp-ts-routing'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { authorInviteCheckMatch, authorInvitePersonaMatch, profileMatch } from '../../routes.js'
import { ProfileId } from '../../types/index.js'
import { isPseudonym } from '../../types/Pseudonym.js'
import type { User } from '../../user.js'

export function checkPage({
  inviteId,
  persona,
  user,
  locale,
}: {
  inviteId: Uuid
  persona: 'public' | 'pseudonym'
  user: User
  locale: SupportedLocale
}) {
  return StreamlinePageResponse({
    title: plainText`${translate(locale, 'author-invite-flow', 'checkTitle')()}`,
    main: html`
      <single-use-form>
        <form method="post" action="${format(authorInviteCheckMatch.formatter, { id: inviteId })}" novalidate>
          <h1>${translate(locale, 'author-invite-flow', 'checkYourDetails')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${translate(locale, 'author-invite-flow', 'yourDetails')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>${translate(locale, 'author-invite-flow', 'publishedName')()}</span></dt>
                <dd>${displayAuthor(persona === 'public' ? user : { name: user.pseudonym })}</dd>
                <dd>
                  <a href="${format(authorInvitePersonaMatch.formatter, { id: inviteId })}"
                    >${rawHtml(
                      translate(
                        locale,
                        'author-invite-flow',
                        'changeName',
                      )({ visuallyHidden: (s: string) => `<span class="visually-hidden">${s}</span>` }),
                    )}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <h2>${translate(locale, 'author-invite-flow', 'nowPublish')()}</h2>

          <p>${translate(locale, 'author-invite-flow', 'weWillAddYourName')()}</p>

          <button>${translate(locale, 'author-invite-flow', 'updatePrereview')()}</button>
        </form>
      </single-use-form>
    `,
    canonical: format(authorInviteCheckMatch.formatter, { id: inviteId }),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}">${name}</a>`
  }

  return name
}
