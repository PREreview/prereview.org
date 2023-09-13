import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { getClubName } from '../club-details'
import type { ClubId } from '../club-id'
import { type Html, html, rawHtml } from '../html'
import { clubProfileMatch } from '../routes'
import type { SlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'

export function renderOrcidProfile(
  orcid: Orcid,
  slackUser: SlackUser | undefined,
  researchInterests: NonEmptyString | undefined,
  clubs: ReadonlyArray<ClubId>,
) {
  return html`
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
      ${researchInterests
        ? html`
            <div>
              <dt>Research interests</dt>
              <dd>${researchInterests}</dd>
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
