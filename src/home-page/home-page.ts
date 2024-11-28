import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import assets from '../manifest.json' with { type: 'json' }
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
  locale,
  recentPrereviews,
  recentReviewRequests,
  statistics,
}: {
  canRequestReviews: boolean
  canSeeGatesLogo: boolean
  locale: SupportedLocale
  recentPrereviews: ReadonlyArray<RecentPrereview>
  recentReviewRequests: ReadonlyArray<RecentReviewRequest>
  statistics: { prereviews: number; servers: number; users: number }
}) =>
  PageResponse({
    title: plainText`PREreview: ${translate(locale, 'home-page', 'slogan')({ swoosh: identity })}`,
    main: html`
      <div class="hero">
        <h1>${rawHtml(translate(locale, 'home-page', 'slogan')({ swoosh: text => `<em>${text}</em>` }))}</h1>
        <p>${translate(locale, 'home-page', 'heroText')()}</p>

        <div class="button-group">
          <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
            >${translate(locale, 'home-page', 'reviewPreprintButton')()}</a
          >
          ${canRequestReviews
            ? html`
                <a href="${format(requestAPrereviewMatch.formatter, {})}"
                  >${translate(locale, 'home-page', 'requestReviewButton')()}</a
                >
              `
            : ''}
        </div>

        <img src="${assets['stool.svg']}" width="794" height="663" alt="" />
      </div>

      <div class="overview">
        <section aria-labelledby="for-underserved-researchers-title">
          <h2 id="for-underserved-researchers-title">
            ${translate(locale, 'home-page', 'overviewUnderservedResearchersTitle')()}
          </h2>

          <p>${translate(locale, 'home-page', 'overviewUnderservedResearchersText')()}</p>
        </section>

        <div></div>

        <section aria-labelledby="a-better-way-title">
          <h2 id="a-better-way-title">${translate(locale, 'home-page', 'overviewBetterWayTitle')()}</h2>

          <p>${translate(locale, 'home-page', 'overviewBetterWayText')()}</p>

          <a href="${format(aboutUsMatch.formatter, {})}" class="forward"
            >${translate(locale, 'home-page', 'overviewBetterWayLink')()}</a
          >
        </section>
      </div>

      ${pipe(
        recentReviewRequests,
        RA.matchW(
          () => '',
          requests => html`
            <section aria-labelledby="recent-review-requests-title">
              <h2 id="recent-review-requests-title">${translate(locale, 'home-page', 'requestsTitle')()}</h2>
              <ol class="cards" aria-labelledby="recent-review-requests-title" tabindex="0">
                ${requests.map(
                  (request, index) => html`
                    <li>
                      <article aria-labelledby="request-${index}-title">
                        <h3 id="request-${index}-title" class="visually-hidden">
                          ${rawHtml(
                            translate(
                              locale,
                              'requests-list',
                              'requestTitle',
                            )({
                              preprint: html`<cite
                                dir="${rtlDetect.getLangDir(request.preprint.language)}"
                                lang="${request.preprint.language}"
                                >${request.preprint.title}</cite
                              >`.toString(),
                            }),
                          )}
                        </h3>

                        <a
                          href="${format(writeReviewMatch.formatter, {
                            id: request.preprint.id,
                          })}"
                        >
                          ${rawHtml(
                            translate(
                              locale,
                              'requests-list',
                              'requestText',
                            )({
                              preprint: html`<cite
                                dir="${rtlDetect.getLangDir(request.preprint.language)}"
                                lang="${request.preprint.language}"
                                >${request.preprint.title}</cite
                              >`.toString(),
                            }),
                          )}
                        </a>

                        ${request.subfields.length > 0
                          ? html`
                              <ul class="categories">
                                ${request.subfields.map(
                                  subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`,
                                )}
                              </ul>
                            `
                          : ''}

                        <dl>
                          <dt>${translate(locale, 'requests-list', 'requestPublished')()}</dt>
                          <dd>${renderDate(locale)(request.published)}</dd>
                          <dt>${translate(locale, 'requests-list', 'requestServer')()}</dt>
                          <dd>
                            ${match(request.preprint.id.type)
                              .with('advance', () => 'Advance')
                              .with('africarxiv', () => 'AfricArXiv Preprints')
                              .with('arcadia-science', () => 'Arcadia Science')
                              .with('arxiv', () => 'arXiv')
                              .with('authorea', () => 'Authorea')
                              .with('biorxiv', () => 'bioRxiv')
                              .with('chemrxiv', () => 'ChemRxiv')
                              .with('curvenote', () => 'Curvenote')
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
                              .with('verixiv', () => 'VeriXiv')
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
                <a href="${format(reviewRequestsMatch.formatter, {})}" class="forward"
                  >${translate(locale, 'home-page', 'requestsLink')()}</a
                >
              </nav>
            </section>
          `,
        ),
      )}

      <section aria-labelledby="statistics-title">
        <h2 id="statistics-title">${translate(locale, 'home-page', 'statisticsTitle')()}</h2>

        <ul class="statistics">
          <li>
            ${rawHtml(
              translate(
                locale,
                'home-page',
                'statisticsReviews',
              )({
                number: statistics.prereviews,
                data: text => `<data value="${statistics.servers}">${text}</data>`,
              }),
            )}
          </li>
          <li>
            ${rawHtml(
              translate(
                locale,
                'home-page',
                'statisticsServers',
              )({
                number: statistics.servers,
                data: text => `<data value="${statistics.servers}">${text}</data>`,
              }),
            )}
          </li>
          <li>
            ${rawHtml(
              translate(
                locale,
                'home-page',
                'statisticsUsers',
              )({
                number: statistics.users,
                data: text => `<data value="${statistics.users}">${text}</data>`,
              }),
            )}
          </li>
        </ul>
      </section>

      ${pipe(
        recentPrereviews,
        RA.matchW(
          () => '',
          prereviews => html`
            <section aria-labelledby="recent-prereviews-title">
              <h2 id="recent-prereviews-title">${translate(locale, 'home-page', 'reviewsTitle')()}</h2>

              <ol class="cards" aria-labelledby="recent-prereviews-title" tabindex="0">
                ${prereviews.map(
                  prereview => html`
                    <li>
                      <article aria-labelledby="prereview-${prereview.id}-title">
                        <h3 id="prereview-${prereview.id}-title" class="visually-hidden">
                          ${rawHtml(
                            translate(
                              locale,
                              'reviews-list',
                              'reviewTitle',
                            )({
                              preprint: html`<cite
                                dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                                lang="${prereview.preprint.language}"
                                >${prereview.preprint.title}</cite
                              >`.toString(),
                            }),
                          )}
                        </h3>

                        <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                          ${rawHtml(
                            prereview.club
                              ? translate(
                                  locale,
                                  'reviews-list',
                                  'clubReviewText',
                                )({
                                  club: html`<b>${getClubName(prereview.club)}</b>`.toString(),
                                  reviewers: formatList(locale)(prereview.reviewers).toString(),
                                  preprint: html`<cite
                                    dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                                    lang="${prereview.preprint.language}"
                                    >${prereview.preprint.title}</cite
                                  >`.toString(),
                                })
                              : translate(
                                  locale,
                                  'reviews-list',
                                  'reviewText',
                                )({
                                  reviewers: formatList(locale)(prereview.reviewers).toString(),
                                  preprint: html`<cite
                                    dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                                    lang="${prereview.preprint.language}"
                                    >${prereview.preprint.title}</cite
                                  >`.toString(),
                                }),
                          )}
                        </a>

                        ${prereview.subfields.length > 0
                          ? html`
                              <ul class="categories">
                                ${prereview.subfields.map(
                                  subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`,
                                )}
                              </ul>
                            `
                          : ''}

                        <dl>
                          <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                          <dd>${renderDate(locale)(prereview.published)}</dd>
                          <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                          <dd>
                            ${match(prereview.preprint.id.type)
                              .with('advance', () => 'Advance')
                              .with('africarxiv', () => 'AfricArXiv Preprints')
                              .with('arcadia-science', () => 'Arcadia Science')
                              .with('arxiv', () => 'arXiv')
                              .with('authorea', () => 'Authorea')
                              .with('biorxiv', () => 'bioRxiv')
                              .with('chemrxiv', () => 'ChemRxiv')
                              .with('curvenote', () => 'Curvenote')
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
                              .with('verixiv', () => 'VeriXiv')
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
                <a href="${format(reviewsMatch.formatter, {})}" class="forward"
                  >${translate(locale, 'home-page', 'reviewsLink')()}</a
                >
              </nav>
            </section>
          `,
        ),
      )}

      <section aria-labelledby="funders-title">
        <h2 id="funders-title">${translate(locale, 'home-page', 'fundersTitle')()}</h2>

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
