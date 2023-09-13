import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type { ClubId } from '../club-id'
import { html, plainText } from '../html'
import type { Page } from '../page'
import type { Pseudonym } from '../pseudonym'
import type { SlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'
import type { Prereviews } from './prereviews'
import { renderListOfPrereviews } from './render-list-of-prereviews'
import { renderOrcidProfile } from './render-orcid-profile'

export function createPage(profile: OrcidProfile | PseudonymProfile) {
  return {
    title: plainText`${profile.name}`,
    content: html`
      <main id="main-content">
        ${match(profile)
          .with({ type: 'orcid' }, renderContentForOrcid)
          .with({ type: 'pseudonym' }, renderContentForPseudonym)
          .exhaustive()}
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  } satisfies Page
}

interface OrcidProfile {
  type: 'orcid'
  name: NonEmptyString
  orcid: Orcid
  slackUser: SlackUser | undefined
  researchInterests: NonEmptyString | undefined
  clubs: ReadonlyArray<ClubId>
  avatar: URL | undefined
  isOpenForRequests: boolean
  prereviews: Prereviews
}

function renderContentForOrcid({
  name,
  orcid,
  slackUser,
  researchInterests,
  clubs,
  avatar,
  isOpenForRequests,
  prereviews,
}: OrcidProfile) {
  return html`
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
  `
}

interface PseudonymProfile {
  type: 'pseudonym'
  name: Pseudonym
  prereviews: Prereviews
}

function renderContentForPseudonym({ name, prereviews }: PseudonymProfile) {
  return html`
    <div class="profile-header">
      <div>
        <h1>${name}</h1>
      </div>
    </div>

    <h2>PREreviews</h2>

    ${renderListOfPrereviews(prereviews, name)}
  `
}
