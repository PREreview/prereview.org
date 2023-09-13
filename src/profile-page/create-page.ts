import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type { Prereviews } from '.'
import type { ClubId } from '../club-id'
import { html, plainText } from '../html'
import type { Page } from '../page'
import type { SlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'
import { renderListOfPrereviews } from './render-list-of-prereviews'
import { renderOrcidProfile } from './render-orcid-profile'

export function createPage({
  orcid,
  name,
  prereviews,
  avatar,
  researchInterests,
  clubs = [],
  slackUser,
  isOpenForRequests = false,
}: {
  avatar?: URL
  clubs?: ReadonlyArray<ClubId>
  name: string
  orcid?: Orcid
  prereviews: Prereviews
  researchInterests?: NonEmptyString
  slackUser?: SlackUser
  isOpenForRequests?: boolean
}) {
  const profile = orcid
    ? {
        type: 'orcid' as const,
        name,
        orcid,
        slackUser,
        researchInterests,
        clubs,
        avatar,
        isOpenForRequests,
        prereviews,
      }
    : { type: 'pseudonym' as const, name, prereviews }

  return {
    title: plainText`${name}`,
    content: match(profile)
      .with({ type: 'orcid' }, renderContentForOrcid)
      .with({ type: 'pseudonym' }, renderContentForPseudonym)
      .exhaustive(),
    skipLinks: [[html`Skip to main content`, '#main-content']],
  } satisfies Page
}

interface OrcidProfile {
  type: 'orcid'
  name: string
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

interface PseudonymProfile {
  type: 'pseudonym'
  name: string
  prereviews: Prereviews
}

function renderContentForPseudonym({ name, prereviews }: PseudonymProfile) {
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
