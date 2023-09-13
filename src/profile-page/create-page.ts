import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import type { Prereviews } from '.'
import { getClubName } from '../club-details'
import type { ClubId } from '../club-id'
import { type Html, html, plainText, rawHtml } from '../html'
import { page } from '../page'
import { clubProfileMatch, reviewMatch } from '../routes'
import type { SlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'
import { renderDate } from '../time'
import type { User } from '../user'

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
    content: html`
      <main id="main-content">
        <div class="profile-header">
          <div>
            <h1>${name}</h1>

            ${orcid
              ? html`
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
                                    html`<a href="${format(clubProfileMatch.formatter, { id: club })}"
                                      >${getClubName(club)}</a
                                    >`,
                                ),
                                formatList('en'),
                              )}
                            </dd>
                          </div>
                        `
                      : ''}
                  </dl>
                `
              : ''}
          </div>

          ${avatar instanceof URL ? html` <img src="${avatar.href}" width="300" height="300" alt="" /> ` : ''}
        </div>

        <h2>PREreviews</h2>

        ${isOpenForRequests ? html` <div class="inset">${name} is happy to take requests for a PREreview.</div> ` : ''}
        ${pipe(
          prereviews,
          RA.match(
            () => html`
              <div class="inset">
                <p>${name} hasn’t published a PREreview yet.</p>

                <p>When they do, it’ll appear here.</p>
              </div>
            `,
            prereviews => html`
              <ol class="cards">
                ${prereviews.map(
                  prereview => html`
                    <li>
                      <article>
                        <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                          ${pipe(
                            prereview.reviewers,
                            RNEA.map(name => html`<b>${name}</b>`),
                            formatList('en'),
                          )}
                          ${prereview.club ? html`of the <b>${getClubName(prereview.club)}</b>` : ''} reviewed
                          <cite dir="${getLangDir(prereview.preprint.language)}" lang="${prereview.preprint.language}"
                            >${prereview.preprint.title}</cite
                          >
                        </a>

                        <dl>
                          <dt>Review published</dt>
                          <dd>${renderDate(prereview.published)}</dd>
                          <dt>Preprint server</dt>
                          <dd>
                            ${match(prereview.preprint.id.type)
                              .with('africarxiv', () => 'AfricArXiv Preprints')
                              .with('arxiv', () => 'arXiv')
                              .with('authorea', () => 'Authorea')
                              .with('biorxiv', () => 'bioRxiv')
                              .with('chemrxiv', () => 'ChemRxiv')
                              .with('eartharxiv', () => 'EarthArXiv')
                              .with('ecoevorxiv', () => 'EcoEvoRxiv')
                              .with('edarxiv', () => 'EdArXiv')
                              .with('engrxiv', () => 'engrXiv')
                              .with('medrxiv', () => 'medRxiv')
                              .with('metaarxiv', () => 'MetaArXiv')
                              .with('osf', () => 'OSF Preprints')
                              .with('philsci', () => 'PhilSci-Archive')
                              .with('preprints.org', () => 'Preprints.org')
                              .with('psyarxiv', () => 'PsyArXiv')
                              .with('research-square', () => 'Research Square')
                              .with('scielo', () => 'SciELO Preprints')
                              .with('science-open', () => 'ScienceOpen Preprints')
                              .with('socarxiv', () => 'SocArXiv')
                              .with('zenodo', () => 'Zenodo')
                              .exhaustive()}
                          </dd>
                        </dl>
                      </article>
                    </li>
                  `,
                )}
              </ol>
            `,
          ),
        )}
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
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
