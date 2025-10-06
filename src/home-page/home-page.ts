import { Array, flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { getClubName } from '../Clubs/index.ts'
import { type Html, html, plainText, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import assets from '../manifest.json' with { type: 'json' }
import * as PreprintServers from '../PreprintServers/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import {
  homeMatch,
  requestAPrereviewMatch,
  reviewAPreprintMatch,
  reviewMatch,
  reviewRequestsMatch,
  reviewsMatch,
  writeReviewMatch,
} from '../routes.ts'
import { renderDate } from '../time.ts'
import { getSubfieldName } from '../types/subfield.ts'
import type { RecentPrereview } from './recent-prereviews.ts'
import type { RecentReviewRequest } from './recent-review-requests.ts'

export const createPage = ({
  canReviewDatasets = false,
  locale,
  recentPrereviews,
  recentReviewRequests,
  statistics,
}: {
  canReviewDatasets?: boolean
  locale: SupportedLocale
  recentPrereviews: ReadonlyArray<RecentPrereview>
  recentReviewRequests: ReadonlyArray<RecentReviewRequest>
  statistics: { prereviews: number; servers: number; users: number }
}) =>
  PageResponse({
    title: plainText`PREreview: ${translate(locale, 'home-page', 'slogan')({ swoosh: identity })}`,
    main: html`
      <div class="hero">
        <div>
          <h1>${rawHtml(translate(locale, 'home-page', 'slogan')({ swoosh: text => `<em>${text}</em>` }))}</h1>
          <p>${translate(locale, 'home-page', 'heroText')()}</p>

          <div class="button-group">
            <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
              >${translate(locale, 'home-page', 'reviewPreprintButton')()}</a
            >
            <a href="${format(requestAPrereviewMatch.formatter, {})}"
              >${translate(locale, 'home-page', 'requestReviewButton')()}</a
            >
            ${canReviewDatasets ? html`<a href="${Routes.ReviewADataset}">Review a dataset</a>` : ''}
          </div>
        </div>
        <img src="${assets['stool.svg']}" width="794" height="663" alt="" />
      </div>

      <div class="sections">
        <section aria-labelledby="training-title">
          <h2 id="training-title">${translate(locale, 'home-page', 'trainingTitle')()}</h2>

          <p>${translate(locale, 'home-page', 'trainingText')()}</p>

          <a href="${Routes.Trainings}">${translate(locale, 'home-page', 'trainingLink')()}</a>
        </section>

        <section aria-labelledby="live-reviews-title">
          <h2 id="live-reviews-title">${translate(locale, 'home-page', 'liveReviewsTitle')()}</h2>

          <p>${translate(locale, 'home-page', 'liveReviewsText')()}</p>

          <a href="${Routes.LiveReviews}">${translate(locale, 'home-page', 'liveReviewsLink')()}</a>
        </section>

        <section aria-labelledby="clubs-title">
          <h2 id="clubs-title">${translate(locale, 'home-page', 'clubsTitle')()}</h2>

          <p>${translate(locale, 'home-page', 'clubsText')()}</p>

          <a href="${Routes.Clubs}">${translate(locale, 'home-page', 'clubsLink')()}</a>
        </section>
      </div>

      <section class="mission" aria-labelledby="mission-title">
        <div>
          <h2 id="mission-title">${translate(locale, 'home-page', 'missionTitle')()}</h2>

          <p>${translate(locale, 'home-page', 'missionText')()}</p>

          <a href="${Routes.AboutUs}" class="button">${translate(locale, 'home-page', 'missionLink')()}</a>
        </div>
      </section>

      ${Array.match(recentPrereviews, {
        onEmpty: () => '',
        onNonEmpty: prereviews => html`
          <section aria-labelledby="recent-prereviews-title">
            <header>
              <h2 id="recent-prereviews-title">${translate(locale, 'home-page', 'reviewsTitle')()}</h2>
            </header>

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
                                numberOfReviewers: prereview.reviewers.named.length + prereview.reviewers.anonymous,
                                reviewers: pipe(
                                  prereview.reviewers.named,
                                  Array.appendAll(
                                    prereview.reviewers.anonymous > 0
                                      ? [
                                          translate(
                                            locale,
                                            'reviews-list',
                                            'otherAuthors',
                                          )({ number: prereview.reviewers.anonymous }),
                                        ]
                                      : [],
                                  ),
                                  formatList(locale),
                                ).toString(),
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
                                numberOfReviewers: prereview.reviewers.named.length + prereview.reviewers.anonymous,
                                reviewers: pipe(
                                  prereview.reviewers.named,
                                  Array.appendAll(
                                    prereview.reviewers.anonymous > 0
                                      ? [
                                          translate(
                                            locale,
                                            'reviews-list',
                                            'otherAuthors',
                                          )({ number: prereview.reviewers.anonymous }),
                                        ]
                                      : [],
                                  ),
                                  formatList(locale),
                                ).toString(),
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
                                subfield => html`<li><span>${getSubfieldName(subfield, locale)}</span></li>`,
                              )}
                            </ul>
                          `
                        : ''}

                      <dl>
                        <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                        <dd>${renderDate(locale)(prereview.published)}</dd>
                        <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                        <dd>${PreprintServers.getName(prereview.preprint.id)}</dd>
                      </dl>
                    </article>
                  </li>
                `,
              )}
            </ol>

            <nav>
              <a href="${format(reviewsMatch.formatter, {})}" class="forward"
                ><span>${translate(locale, 'home-page', 'reviewsLink')()}</span></a
              >
            </nav>
          </section>
        `,
      })}
      ${Array.match(recentReviewRequests, {
        onEmpty: () => '',
        onNonEmpty: requests => html`
          <section aria-labelledby="recent-review-requests-title">
            <header>
              <h2 id="recent-review-requests-title">${translate(locale, 'home-page', 'requestsTitle')()}</h2>
            </header>
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
                                subfield => html`<li><span>${getSubfieldName(subfield, locale)}</span></li>`,
                              )}
                            </ul>
                          `
                        : ''}

                      <dl>
                        <dt>${translate(locale, 'requests-list', 'requestPublished')()}</dt>
                        <dd>${renderDate(locale)(request.published)}</dd>
                        <dt>${translate(locale, 'requests-list', 'requestServer')()}</dt>
                        <dd>${PreprintServers.getName(request.preprint.id)}</dd>
                      </dl>
                    </article>
                  </li>
                `,
              )}
            </ol>

            <nav>
              <a href="${format(reviewRequestsMatch.formatter, {})}" class="forward"
                ><span>${translate(locale, 'home-page', 'requestsLink')()}</span></a
              >
            </nav>
          </section>
        `,
      })}

      <section aria-labelledby="statistics-title">
        <header>
          <h2 id="statistics-title">${translate(locale, 'home-page', 'statisticsTitle')()}</h2>
        </header>

        <ul class="statistics">
          <li>
            <span
              >${rawHtml(
                translate(
                  locale,
                  'home-page',
                  'statisticsReviews',
                )({
                  number: statistics.prereviews,
                  data: text => `<data value="${statistics.prereviews}">${text}</data>`,
                }),
              )}</span
            >
          </li>
          <li>
            <span
              >${rawHtml(
                translate(
                  locale,
                  'home-page',
                  'statisticsServers',
                )({
                  number: statistics.servers,
                  data: text => `<data value="${statistics.servers}">${text}</data>`,
                }),
              )}</span
            >
          </li>
          <li>
            <span
              >${rawHtml(
                translate(
                  locale,
                  'home-page',
                  'statisticsUsers',
                )({
                  number: statistics.users,
                  data: text => `<data value="${statistics.users}">${text}</data>`,
                }),
              )}</span
            >
          </li>
        </ul>
      </section>

      <section aria-labelledby="funders-title">
        <header>
          <h2 id="funders-title">${translate(locale, 'home-page', 'fundersTitle')()}</h2>
        </header>

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
          <li>
            <a href="https://www.gatesfoundation.org/">
              <img src="${assets['gates.svg']}" width="2000" height="221.65" loading="lazy" alt="Gates Foundation" />
            </a>
          </li>
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
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`<b>${item}</b>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
