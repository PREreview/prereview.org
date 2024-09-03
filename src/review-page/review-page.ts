import { toUrl } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import type { Orcid } from 'orcid-id-ts'
import rtlDetect from 'rtl-detect'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { clubProfileMatch, preprintReviewsMatch, profileMatch, reviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { isPseudonym } from '../types/pseudonym.js'
import type { Prereview } from './prereview.js'
import type { Response } from './response.js'

export const createPage = ({
  id,
  locale,
  review,
  responses,
}: {
  id: number
  locale: SupportedLocale
  review: Prereview
  responses: ReadonlyArray<Response>
}) =>
  PageResponse({
    title: plainText(
      translate(
        locale,
        'review-page',
        review.structured ? 'structuredReviewTitle' : 'reviewTitle',
      )({ preprint: plainText`“${review.preprint.title}”`.toString() }),
    ),
    description: plainText(
      review.club
        ? translate(
            locale,
            'review-page',
            'clubReviewAuthors',
          )({
            authors: pipe(
              review.authors.named,
              RNEA.map(displayAuthor),
              RNEA.concatW(
                review.authors.anonymous > 0
                  ? [translate(locale, 'review-page', 'otherAuthors')({ otherAuthors: review.authors.anonymous })]
                  : [],
              ),
              formatList(locale),
            ).toString(),
            club: getClubName(review.club),
            hide: identity,
          })
        : translate(
            locale,
            'review-page',
            'reviewAuthors',
          )({
            authors: pipe(
              review.authors.named,
              RNEA.map(displayAuthor),
              RNEA.concatW(
                review.authors.anonymous > 0
                  ? [translate(locale, 'review-page', 'otherAuthors')({ otherAuthors: review.authors.anonymous })]
                  : [],
              ),
              formatList(locale),
            ).toString(),
            hide: identity,
          }),
    ),
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: review.preprint.id })}" class="back"
        >${translate(locale, 'review-page', 'otherReviewsLink')()}</a
      >
      <a href="${review.preprint.url.href}" class="forward"
        >${translate(locale, 'review-page', 'readPreprintLink')()}</a
      >
    `,
    main: html`
      <header>
        ${review.requested
          ? html`<span class="tag">${translate(locale, 'review-page', 'requestedPrereview')()}</span>`
          : ''}
        ${review.live ? html`<span class="tag">${translate(locale, 'review-page', 'liveReview')()}</span>` : ''}

        <h1>
          ${rawHtml(
            translate(
              locale,
              'review-page',
              review.structured ? 'structuredReviewTitle' : 'reviewTitle',
            )({
              preprint: html`<cite
                lang="${review.preprint.language}"
                dir="${rtlDetect.getLangDir(review.preprint.language)}"
                >${review.preprint.title}</cite
              >`.toString(),
            }),
          )}
        </h1>

        <div class="byline">
          ${rawHtml(
            review.club
              ? translate(
                  locale,
                  'review-page',
                  'clubReviewAuthors',
                )({
                  authors: pipe(
                    review.authors.named,
                    RNEA.map(displayAuthor),
                    RNEA.concatW(
                      review.authors.anonymous > 0
                        ? [translate(locale, 'review-page', 'otherAuthors')({ otherAuthors: review.authors.anonymous })]
                        : [],
                    ),
                    formatList(locale),
                  ).toString(),
                  club: html`<a href="${format(clubProfileMatch.formatter, { id: review.club })}"
                    >${getClubName(review.club)}</a
                  >`.toString(),
                  hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                })
              : translate(
                  locale,
                  'review-page',
                  'reviewAuthors',
                )({
                  authors: pipe(
                    review.authors.named,
                    RNEA.map(displayAuthor),
                    RNEA.concatW(
                      review.authors.anonymous > 0
                        ? [translate(locale, 'review-page', 'otherAuthors')({ otherAuthors: review.authors.anonymous })]
                        : [],
                    ),
                    formatList(locale),
                  ).toString(),
                  hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                }),
          )}
        </div>

        <dl>
          <div>
            <dt>${translate(locale, 'review-page', 'published')()}</dt>
            <dd>${renderDate(locale)(review.published)}</dd>
          </div>
          <div>
            <dt>DOI</dt>
            <dd><a href="${toUrl(review.doi).href}" class="doi" translate="no">${review.doi}</a></dd>
          </div>
          <div>
            <dt>${translate(locale, 'review-page', 'license')()}</dt>
            <dd>
              ${match(review.license)
                .with(
                  'CC-BY-4.0',
                  () => html`
                    <a href="https://creativecommons.org/licenses/by/4.0/">
                      <dfn>
                        <abbr title="${translate(locale, 'review-page', 'licenseCcBy40')()}"
                          ><span translate="no">CC BY 4.0</span></abbr
                        >
                      </dfn>
                    </a>
                  `,
                )
                .exhaustive()}
            </dd>
          </div>
        </dl>
      </header>

      <div ${review.language ? html`lang="${review.language}" dir="${rtlDetect.getLangDir(review.language)}"` : ''}>
        ${fixHeadingLevels(1, review.text)}
      </div>

      ${review.addendum
        ? html`
            <h2>${translate(locale, 'review-page', 'addendumTitle')()}</h2>

            ${fixHeadingLevels(2, review.addendum)}
          `
        : ''}
      ${RA.isNonEmpty(responses)
        ? html`
            <article aria-labelledby="responses-title">
              <h2 id="responses-title">Responses</h2>
              <ol class="cards">
                ${pipe(
                  responses,
                  RNEA.map(
                    response => html`
                      <li>
                        <article aria-labelledby="response-${response.id}-title">
                          <header>
                            <h3 class="visually-hidden" id="response-${response.id}-title">
                              Response by ${response.authors.named[0].name}
                              ${response.authors.named.length > 1 ? 'et al.' : ''}
                            </h3>

                            <div class="byline">
                              <span class="visually-hidden">Authored</span> by
                              ${pipe(response.authors.named, RNEA.map(get('name')), formatList(locale))}
                            </div>

                            <dl>
                              <div>
                                <dt>${translate(locale, 'review-page', 'published')()}</dt>
                                <dd>${renderDate(locale)(response.published)}</dd>
                              </div>
                              <div>
                                <dt>DOI</dt>
                                <dd>
                                  <a href="${toUrl(response.doi).href}" class="doi" translate="no">${response.doi}</a>
                                </dd>
                              </div>
                              <div>
                                <dt>${translate(locale, 'review-page', 'license')()}</dt>
                                <dd>
                                  ${match(response.license)
                                    .with(
                                      'CC-BY-4.0',
                                      () => html`
                                        <a href="https://creativecommons.org/licenses/by/4.0/">
                                          <dfn>
                                            <abbr title="${translate(locale, 'review-page', 'licenseCcBy40')()}"
                                              ><span translate="no">CC BY 4.0</span></abbr
                                            >
                                          </dfn>
                                        </a>
                                      `,
                                    )
                                    .exhaustive()}
                                </dd>
                              </div>
                            </dl>
                          </header>

                          <div
                            ${response.language
                              ? html`lang="${response.language}" dir="${rtlDetect.getLangDir(response.language)}"`
                              : ''}
                          >
                            ${fixHeadingLevels(3, response.text)}
                          </div>
                        </article>
                      </li>
                    `,
                  ),
                )}
              </ol>
            </article>
          `
        : ''}
    `,
    skipToLabel: 'prereview',
    canonical: format(reviewMatch.formatter, { id }),
  })

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
