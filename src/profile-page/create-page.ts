import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details'
import { type Html, html, plainText, rawHtml } from '../html'
import type { Page } from '../page'
import { clubProfileMatch } from '../routes'
import type { OrcidProfile } from './orcid-profile'
import type { PseudonymProfile } from './pseudonym-profile'
import { renderListOfPrereviews } from './render-list-of-prereviews'

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

function renderContentForOrcid({
  name,
  orcid,
  slackUser,
  careerStage,
  researchInterests,
  location,
  clubs,
  avatar,
  isOpenForRequests,
  prereviews,
}: OrcidProfile) {
  return html`
    <div class="profile-header">
      <div>
        <h1>${name}</h1>

        <dl class="summary-list">
          <div>
            <dt>ORCID iD</dt>
            <dd><a href="https://orcid.org/${orcid}" class="orcid">${orcid}</a></dd>
          </div>

          ${slackUser
            ? html`
                <div>
                  <dt>Slack Community name</dt>
                  <dd>
                    <span class="slack">
                      <img src="${slackUser.image.href}" alt="" width="48" height="48" />
                      <span>${slackUser.name}</span>
                    </span>
                  </dd>
                </div>
              `
            : ''}
          ${careerStage
            ? html`
                <div>
                  <dt>Career stage</dt>
                  <dd>
                    ${match(careerStage)
                      .with('early', () => 'Early')
                      .with('mid', () => 'Mid')
                      .with('late', () => 'Late')
                      .exhaustive()}
                  </dd>
                </div>
              `
            : ''}
          ${researchInterests
            ? html`
                <div>
                  <dt>Research interests</dt>
                  <dd>${researchInterests}</dd>
                </div>
              `
            : ''}
          ${location
            ? html`
                <div>
                  <dt>Location</dt>
                  <dd>${location}</dd>
                </div>
              `
            : ''}
          ${RA.isNonEmpty(clubs)
            ? html`
                <div>
                  <dt>Clubs</dt>
                  <dd>
                    ${pipe(
                      clubs,
                      RNEA.map(
                        club =>
                          html`<a href="${format(clubProfileMatch.formatter, { id: club })}">${getClubName(club)}</a>`,
                      ),
                      formatList('en'),
                    )}
                  </dd>
                </div>
              `
            : ''}
        </dl>
      </div>

      ${avatar instanceof URL ? html` <img src="${avatar.href}" width="300" height="300" alt="" /> ` : ''}
    </div>

    <h2>PREreviews</h2>

    ${isOpenForRequests
      ? html`
          <div class="inset">
            ${name} is happy to take requests for a PREreview.
            ${slackUser
              ? html`They can be contacted on our
                  <a href="https://content.prereview.org/join-prereview-slack/">Slack Community</a>.`
              : ''}
          </div>
        `
      : ''}
    ${renderListOfPrereviews(prereviews, name)}
  `
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

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
