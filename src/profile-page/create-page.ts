import type { Orcid } from 'orcid-id-ts'
import type { Prereviews } from '.'
import type { ClubId } from '../club-id'
import { html, plainText } from '../html'
import { page } from '../page'
import type { SlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'
import type { User } from '../user'
import { renderListOfPrereviews } from './render-list-of-prereviews'
import { renderOrcidProfile } from './render-orcid-profile'

export function createPage({
  orcid,
  name,
  prereviews,
  user,
  avatar,
  researchInterests,
  clubs = [],
  slackUser,
}: {
  avatar?: URL
  clubs?: ReadonlyArray<ClubId>
  name: string
  orcid?: Orcid
  prereviews: Prereviews
  researchInterests?: NonEmptyString
  slackUser?: SlackUser
  user?: User
}) {
  const isOpenForRequests = orcid === '0000-0003-4921-6155'
  return page({
    title: plainText`${name}`,
    content: orcid
      ? renderContentForOrcid(name, orcid, slackUser, researchInterests, clubs, avatar, isOpenForRequests, prereviews)
      : renderContentForPseudonym(name, prereviews),
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function renderContentForOrcid(
  name: string,
  orcid: Orcid,
  slackUser: SlackUser | undefined,
  researchInterests: NonEmptyString | undefined,
  clubs: ReadonlyArray<ClubId>,
  avatar: URL | undefined,
  isOpenForRequests: boolean,
  prereviews: Prereviews,
) {
  return html`
    <main id="main-content">
      <div class="profile-header">
        <div>
          <h1>${name}</h1>

          ${renderOrcidProfile(orcid, slackUser, researchInterests, clubs)}
        </div>

        ${avatar instanceof URL ? html` <img src="${avatar.href}" width="300" height="300" alt="" /> ` : ''}
      </div>

      <h2>PREreviews</h2>

      ${isOpenForRequests ? html` <div class="inset">${name} is happy to take requests for a PREreview.</div> ` : ''}
      ${renderListOfPrereviews(prereviews, name)}
    </main>
  `
}

function renderContentForPseudonym(name: string, prereviews: Prereviews) {
  return html`
    <main id="main-content">
      <div class="profile-header">
        <div>
          <h1>${name}</h1>
        </div>
      </div>

      <h2>PREreviews</h2>

      ${renderListOfPrereviews(prereviews, name)}
    </main>
  `
}
