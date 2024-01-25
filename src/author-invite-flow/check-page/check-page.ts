import { format } from 'fp-ts-routing'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { authorInviteCheckMatch, authorInvitePersonaMatch, profileMatch } from '../../routes'
import { isPseudonym } from '../../types/pseudonym'
import type { User } from '../../user'

export function checkPage({
  inviteId,
  persona,
  user,
}: {
  inviteId: Uuid
  persona: 'public' | 'pseudonym'
  user: User
}) {
  return StreamlinePageResponse({
    title: plainText`Check your details`,
    main: html`
      <single-use-form>
        <form method="post" action="${format(authorInviteCheckMatch.formatter, { id: inviteId })}" novalidate>
          <h1>Check your details</h1>

          <div class="summary-card">
            <div>
              <h2>Your details</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>Published name</dt>
                <dd>${displayAuthor(persona === 'public' ? user : { name: user.pseudonym })}</dd>
                <dd>
                  <a href="${format(authorInvitePersonaMatch.formatter, { id: inviteId })}"
                    >Change <span class="visually-hidden">name</span></a
                  >
                </dd>
              </div>
            </dl>
          </div>

          <h2>Now publish your updated PREreview</h2>

          <p>We will add your name to the author list.</p>

          <button>Update PREreview</button>
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
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: name } })}"
      >${name}</a
    >`
  }

  return name
}
