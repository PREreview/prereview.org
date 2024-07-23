import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { translate } from '../locales/index.js'
import * as assets from '../manifest.json'
import { PageResponse } from '../response.js'
import {
  aboutUsMatch,
  homeMatch,
  requestAPrereviewMatch,
  reviewAPreprintMatch,
  reviewMatch,
  reviewRequestsMatch,
  reviewsMatch,
  writeReviewMatch,
} from '../routes.js'
import { renderDate } from '../time.js'
import { getSubfieldName } from '../types/subfield.js'
import type { RecentPrereview } from './recent-prereviews.js'
import type { RecentReviewRequest } from './recent-review-requests.js'

export const createPage = ({
  canRequestReviews,
  canSeeGatesLogo,
  recentPrereviews,
  recentReviewRequests,
  statistics,
}: {
  canRequestReviews: boolean
  canSeeGatesLogo: boolean
  recentPrereviews: ReadonlyArray<RecentPrereview>
  recentReviewRequests: ReadonlyArray<RecentReviewRequest>
  statistics: { prereviews: number; servers: number; users: number }
}) =>
  PageResponse({
    title: locale => plainText`PREreview: ${translate(locale, 'home-page', 'slogan', { swoosh: identity })}`,
    main: locale => html`
      <div class="hero">
        <h1>${rawHtml(translate(locale, 'home-page', 'slogan', { swoosh: text => `<em>${text}</em>` }))}</h1>
        <p>Provide and receive constructive feedback on preprints from an international community of your peers.</p>

        <div class="button-group">
          <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Review a preprint</a>
          ${canRequestReviews
            ? html` <a href="${format(requestAPrereviewMatch.formatter, {})}">Request a review</a> `
            : ''}
        </div>

        <img src="${assets['stool.svg']}" width="794" height="663" alt="" />
      </div>

      <div class="overview">
        <section aria-labelledby="for-underserved-researchers-title">
          <h2 id="for-underserved-researchers-title">For underserved researchers</h2>

          <p>
            We support and empower diverse and historically excluded communities of researchers (particularly those at
            early stages of their career) to find a voice, train, and engage in peer review.
          </p>
        </section>

        <div></div>

        <section aria-labelledby="a-better-way-title">
          <h2 id="a-better-way-title">A better way</h2>

          <p>Making science and scholarship more equitable, transparent, and collaborative.</p>

          <a href="${format(aboutUsMatch.formatter, {})}" class="forward">Our mission</a>
        </section>
      </div>

      ${pipe(
        recentReviewRequests,
        RA.match(
          () => html`
            <section class="tops" aria-labelledby="tops-title">
              <h2 id="tops-title" class="visually-hidden">Year of Open Science</h2>

              <img src="${assets['tops.png']}" width="400" height="564" loading="lazy" alt="" />

              <div>
                <p>
                  PREreview joined the US White House, 10 federal agencies, a coalition of more than 85 universities,
                  and other organizations in a commitment to advancing 4
                  <a href="https://nasa.github.io/Transform-to-Open-Science-Book/Year_of_Open_Science_Guide/readme.html"
                    >Year of Open Science</a
                  >
                  goals to:
                </p>

                <ol>
                  <li>Develop a strategic plan for open science.</li>
                  <li>Improve the transparency, integrity, and equity of reviews.</li>
                  <li>Account for open science activities in evaluations.</li>
                  <li>Engage underrepresented communities in the advancement of open science.</li>
                </ol>

                <a
                  href="https://nasa.github.io/Transform-to-Open-Science-Book/Year_of_Open_Science_Guide/participants/PREreview.html"
                  class="forward"
                  >How PREreview is fulfilling this commitment</a
                >
              </div>
            </section>
          `,
          requests => html`
            <section aria-labelledby="recent-review-requests-title">
              <h2 id="recent-review-requests-title">Recent review requests</h2>
              <ol class="cards" aria-labelledby="recent-review-requests-title" tabindex="0">
                ${requests.map(
                  (request, index) => html`
                    <li>
                      <article aria-labelledby="request-${index}-title">
                        <h3 id="request-${index}-title" class="visually-hidden">
                          Review request for
                          <cite
                            dir="${rtlDetect.getLangDir(request.preprint.language)}"
                            lang="${request.preprint.language}"
                            >${request.preprint.title}</cite
                          >
                        </h3>

                        <a
                          href="${format(writeReviewMatch.formatter, {
                            id: request.preprint.id,
                          })}"
                        >
                          A review was requested for
                          <cite
                            dir="${rtlDetect.getLangDir(request.preprint.language)}"
                            lang="${request.preprint.language}"
                            >${request.preprint.title}</cite
                          >
                        </a>

                        ${request.subfields.length > 0
                          ? html`
                              <ul class="categories">
                                ${request.subfields.map(subfield => html`<li>${getSubfieldName(subfield)}</li>`)}
                              </ul>
                            `
                          : ''}

                        <dl>
                          <dt>Review published</dt>
                          <dd>${renderDate(locale)(request.published)}</dd>
                          <dt>Preprint server</dt>
                          <dd>
                            ${match(request.preprint.id.type)
                              .with('africarxiv', () => 'AfricArXiv Preprints')
                              .with('arcadia-science', () => 'Arcadia Science')
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
                              .with('osf', () => 'OSF')
                              .with('osf-preprints', () => 'OSF Preprints')
                              .with('philsci', () => 'PhilSci-Archive')
                              .with('preprints.org', () => 'Preprints.org')
                              .with('psyarxiv', () => 'PsyArXiv')
                              .with('psycharchives', () => 'PsychArchives')
                              .with('research-square', () => 'Research Square')
                              .with('scielo', () => 'SciELO Preprints')
                              .with('science-open', () => 'ScienceOpen Preprints')
                              .with('socarxiv', () => 'SocArXiv')
                              .with('techrxiv', () => 'TechRxiv')
                              .with('zenodo', () => 'Zenodo')
                              .exhaustive()}
                          </dd>
                        </dl>
                      </article>
                    </li>
                  `,
                )}
              </ol>

              <nav>
                <a href="${format(reviewRequestsMatch.formatter, {})}" class="forward">See all requests</a>
              </nav>
            </section>
          `,
        ),
      )}

      <section aria-labelledby="statistics-title">
        <h2 id="statistics-title">Statistics</h2>

        <ul class="statistics">
          <li>
            <data value="${statistics.prereviews}">${statistics.prereviews.toLocaleString(locale)}</data>
            PREreviews
          </li>
          <li>
            <data value="${statistics.servers}">${statistics.servers.toLocaleString(locale)}</data>
            preprint servers
          </li>
          <li>
            <data value="${statistics.users}">${statistics.users.toLocaleString(locale)}</data>
            PREreviewers
          </li>
        </ul>
      </section>

      ${pipe(
        recentPrereviews,
        RA.matchW(
          () => '',
          prereviews => html`
            <section aria-labelledby="recent-prereviews-title">
              <h2 id="recent-prereviews-title">Recent PREreviews</h2>

              <ol class="cards" aria-labelledby="recent-prereviews-title" tabindex="0">
                ${prereviews.map(
                  prereview => html`
                    <li>
                      <article aria-labelledby="prereview-${prereview.id}-title">
                        <h3 id="prereview-${prereview.id}-title" class="visually-hidden">
                          PREreview of
                          <cite
                            dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                            lang="${prereview.preprint.language}"
                            >${prereview.preprint.title}</cite
                          >
                        </h3>

                        <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                          ${formatList(locale)(prereview.reviewers)}
                          ${prereview.club ? html`of the <b>${getClubName(prereview.club)}</b>` : ''} reviewed
                          <cite
                            dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                            lang="${prereview.preprint.language}"
                            >${prereview.preprint.title}</cite
                          >
                        </a>

                        ${prereview.subfields.length > 0
                          ? html`
                              <ul class="categories">
                                ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield)}</li>`)}
                              </ul>
                            `
                          : ''}

                        <dl>
                          <dt>Review published</dt>
                          <dd>${renderDate(locale)(prereview.published)}</dd>
                          <dt>Preprint server</dt>
                          <dd>
                            ${match(prereview.preprint.id.type)
                              .with('africarxiv', () => 'AfricArXiv Preprints')
                              .with('arcadia-science', () => 'Arcadia Science')
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
                              .with('osf', () => 'OSF')
                              .with('osf-preprints', () => 'OSF Preprints')
                              .with('philsci', () => 'PhilSci-Archive')
                              .with('preprints.org', () => 'Preprints.org')
                              .with('psyarxiv', () => 'PsyArXiv')
                              .with('psycharchives', () => 'PsychArchives')
                              .with('research-square', () => 'Research Square')
                              .with('scielo', () => 'SciELO Preprints')
                              .with('science-open', () => 'ScienceOpen Preprints')
                              .with('socarxiv', () => 'SocArXiv')
                              .with('techrxiv', () => 'TechRxiv')
                              .with('zenodo', () => 'Zenodo')
                              .exhaustive()}
                          </dd>
                        </dl>
                      </article>
                    </li>
                  `,
                )}
              </ol>

              <nav>
                <a href="${format(reviewsMatch.formatter, {})}" class="forward">See all reviews</a>
              </nav>
            </section>
          `,
        ),
      )}

      <section aria-labelledby="funders-title">
        <h2 id="funders-title">Funders</h2>

        <ol class="logos">
          <li>
            <a href="https://sloan.org/grant-detail/8729">
              <img
                src="${assets['sloan.svg']}"
                width="350"
                height="190"
                loading="lazy"
                alt="Alfred P. Sloan Foundation"
              />
            </a>
          </li>
          ${canSeeGatesLogo
            ? html`
                <li>
                  <a href="https://www.gatesfoundation.org/">
                    <img
                      src="${assets['gates.svg']}"
                      width="500"
                      height="100"
                      loading="lazy"
                      alt="Bill & Melinda Gates Foundation"
                    />
                  </a>
                </li>
              `
            : ''}
          <li>
            <a href="https://chanzuckerberg.com/">
              <img
                src="${assets['czi.svg']}"
                width="192"
                height="192"
                loading="lazy"
                alt="Chan Zuckerberg Initiative"
              />
            </a>
          </li>
          <li>
            <a href="https://foundation.mozilla.org/">
              <img src="${assets['mozilla.svg']}" width="280" height="80" loading="lazy" alt="Mozilla Foundation" />
            </a>
          </li>
          <li>
            <a href="https://wellcome.org/grant-funding/schemes/open-research-fund">
              <img src="${assets['wellcome.svg']}" width="181" height="181" loading="lazy" alt="Wellcome Trust" />
            </a>
          </li>
        </ol>
      </section>
    `,
    canonical: format(homeMatch.formatter, {}),
    current: 'home',
  })

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`<b>${item}</b>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
