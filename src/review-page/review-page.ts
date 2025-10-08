import { toUrl } from 'doi-ts'
import { Array, flow, identity, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../Clubs/index.ts'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import { preprintReviewsMatch, profileMatch, reviewMatch } from '../routes.ts'
import { renderDate } from '../time.ts'
import { ProfileId } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { isPseudonym } from '../types/Pseudonym.ts'
import type { Comment } from './comments.ts'
import type { Prereview } from './prereview.ts'

export const createPage = ({
  id,
  locale,
  review,
  comments,
}: {
  id: number
  locale: SupportedLocale
  review: Prereview
  comments: ReadonlyArray<Comment>
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
              Array.map(displayAuthor),
              Array.appendAll(
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
              Array.map(displayAuthor),
              Array.appendAll(
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
        ><span>${translate(locale, 'review-page', 'otherReviewsLink')()}</span></a
      >
      <a href="${review.preprint.url.href}" class="forward"
        ><span>${translate(locale, 'review-page', 'readPreprintLink')()}</span></a
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
                    Array.map(displayAuthor),
                    Array.appendAll(
                      review.authors.anonymous > 0
                        ? [translate(locale, 'review-page', 'otherAuthors')({ otherAuthors: review.authors.anonymous })]
                        : [],
                    ),
                    formatList(locale),
                  ).toString(),
                  club: html`<a href="${Routes.ClubProfile.href({ id: review.club })}"
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
                    Array.map(displayAuthor),
                    Array.appendAll(
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
                  'CC0-1.0',
                  () => html`
                    <a href="https://creativecommons.org/publicdomain/zero/1.0/">
                      <dfn>
                        <abbr title="CC0 1.0 Universal"><span translate="no">CC0 1.0</span></abbr>
                      </dfn>
                    </a>
                  `,
                )
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

      <article aria-labelledby="comments-title">
        <h2 id="comments-title">${translate(locale, 'review-page', 'commentsTitle')()}</h2>

        <a href="${Routes.WriteComment.href({ id })}" class="button"
          >${translate(locale, 'review-page', 'writeCommentButton')()}</a
        >

        ${Array.match(comments, {
          onEmpty: () => html`<p>${translate(locale, 'review-page', 'noComments')()}</p>`,
          onNonEmpty: comments =>
            html`<ol class="cards">
              ${pipe(
                comments,
                Array.map(
                  item => html`
                    <li>
                      <article aria-labelledby="comment-${item.id}-title">
                        <header>
                          <h3 class="visually-hidden" id="comment-${item.id}-title">
                            ${translate(
                              locale,
                              'review-page',
                              'commentItemTitle',
                            )({
                              author: pipe(Array.headNonEmpty(item.authors.named), Struct.get('name')),
                              authors: item.authors.named.length,
                            })}
                          </h3>

                          <div class="byline">
                            ${rawHtml(
                              translate(
                                locale,
                                'review-page',
                                'commentItemAuthors',
                              )({
                                authors: pipe(
                                  item.authors.named,
                                  Array.map(displayAuthor),
                                  formatList(locale),
                                ).toString(),
                                hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                              }),
                            )}
                          </div>

                          <dl>
                            <div>
                              <dt>${translate(locale, 'review-page', 'published')()}</dt>
                              <dd>${renderDate(locale)(item.published)}</dd>
                            </div>
                            <div>
                              <dt>DOI</dt>
                              <dd>
                                <a href="${toUrl(item.doi).href}" class="doi" translate="no">${item.doi}</a>
                              </dd>
                            </div>
                            <div>
                              <dt>${translate(locale, 'review-page', 'license')()}</dt>
                              <dd>
                                ${match(item.license)
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
                          ${item.language
                            ? html`lang="${item.language}" dir="${rtlDetect.getLangDir(item.language)}"`
                            : ''}
                        >
                          ${fixHeadingLevels(3, item.text)}
                        </div>
                      </article>
                    </li>
                  `,
                ),
              )}
            </ol>`,
        })}
      </article>
    `,
    skipToLabel: 'prereview',
    canonical: format(reviewMatch.formatter, { id }),
  })

function displayAuthor({ name, orcid }: { name: string; orcid?: OrcidId }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}">${name}</a>`
  }

  return name
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
