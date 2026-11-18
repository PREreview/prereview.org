import { Array, flow, identity, Match, Option, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import type { PublishedCommentWithAuthor } from '../../Domain/Comments/index.ts'
import { matchPersona } from '../../Domain/Prereviewers/index.ts'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'
import { preprintReviewsMatch, profileMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { toUrl } from '../../types/Doi.ts'
import { ProfileId } from '../../types/index.ts'
import type { Name } from '../../types/Name.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import { isPseudonym } from '../../types/Pseudonym.ts'
import { PageResponse } from '../Response/index.ts'
import type { Prereview } from '../../Domain/PreprintReviews/index.ts'

export const createPreprintReviewPage = ({
  id,
  locale,
  review,
  comments,
}: {
  id: number
  locale: SupportedLocale
  review: Prereview
  comments: ReadonlyArray<PublishedCommentWithAuthor>
}) => {
  const t = translate(locale, 'review-page')

  return PageResponse({
    title: plainText(
      t(review.structured ? 'structuredReviewTitle' : 'reviewTitle')({ preprint: review.preprint.title }),
    ),
    description: plainText(
      review.club
        ? t('clubReviewAuthors')({
            authors: pipe(
              review.authors.named,
              Array.map(displayAuthor),
              Array.appendAll(
                review.authors.anonymous > 0 ? [t('otherAuthors')({ otherAuthors: review.authors.anonymous })] : [],
              ),
              formatList(locale),
            ),
            club: review.club.name,
            hide: identity,
          })
        : t('reviewAuthors')({
            authors: pipe(
              review.authors.named,
              Array.map(displayAuthor),
              Array.appendAll(
                review.authors.anonymous > 0 ? [t('otherAuthors')({ otherAuthors: review.authors.anonymous })] : [],
              ),
              formatList(locale),
            ),
            hide: identity,
          }),
    ),
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: review.preprint.id })}" class="back"
        >${t('otherReviewsLink')()}</a
      >
      <a href="${review.preprint.url.href}" class="forward">${t('readPreprintLink')()}</a>
    `,
    main: html`
      <header>
        ${review.requested ? html`<span class="tag">${t('requestedPrereview')()}</span>` : ''}
        ${review.live ? html`<span class="tag">${t('liveReview')()}</span>` : ''}
        ${
          review.license === 'CC0-1.0'
            ? html`<span class="tag tag-ai"><span ${languageAttributesFor('en')}>AI-Supported Review</span></span>`
            : ''
        }

        <h1>
          ${t(review.structured ? 'structuredReviewTitle' : 'reviewTitle')({
            preprint: html`<cite ${languageAttributesFor(review.preprint.language)}>${review.preprint.title}</cite>`,
          })}
        </h1>

        <div class="byline">
          ${
            review.club
              ? t('clubReviewAuthors')({
                  authors: pipe(
                    review.authors.named,
                    Array.map(displayAuthor),
                    Array.appendAll(
                      review.authors.anonymous > 0
                        ? [t('otherAuthors')({ otherAuthors: review.authors.anonymous })]
                        : [],
                    ),
                    formatList(locale),
                  ),
                  club: html`<a
                    href="${Routes.ClubProfile.href({ slug: review.club.slug })}"
                    ${languageAttributesFor(review.club.language)}
                    >${review.club.name}</a
                  >`,
                  hide: text => html`<span class="visually-hidden">${text}</span>`,
                })
              : t('reviewAuthors')({
                  authors: pipe(
                    review.authors.named,
                    Array.map(displayAuthor),
                    Array.appendAll(
                      review.authors.anonymous > 0
                        ? [t('otherAuthors')({ otherAuthors: review.authors.anonymous })]
                        : [],
                    ),
                    formatList(locale),
                  ),
                  hide: text => html`<span class="visually-hidden">${text}</span>`,
                })
          }
        </div>

        <dl>
          <div>
            <dt>${t('published')()}</dt>
            <dd>${renderDate(locale)(review.published)}</dd>
          </div>
          <div>
            <dt translate="no">DOI</dt>
            <dd><a href="${toUrl(review.doi).href}" class="doi" dir="auto" translate="no">${review.doi}</a></dd>
          </div>
          <div>
            <dt>${t('license')()}</dt>
            <dd>
              ${Match.value(review.license).pipe(
                Match.literalsExhaustive({
                  'CC0-1.0': () => html`
                    <a href="https://creativecommons.org/publicdomain/zero/1.0/">
                      <dfn>
                        <abbr title="${t('licenseCcZero10')()}"><bdi translate="no">CC0 1.0</bdi></abbr>
                      </dfn>
                    </a>
                  `,
                  'CC-BY-4.0': () => html`
                    <a href="https://creativecommons.org/licenses/by/4.0/">
                      <dfn>
                        <abbr title="${t('licenseCcBy40')()}"><bdi translate="no">CC BY 4.0</bdi></abbr>
                      </dfn>
                    </a>
                  `,
                }),
              )}
            </dd>
          </div>
        </dl>
      </header>

      <div ${review.language ? languageAttributesFor(review.language) : ''}>${fixHeadingLevels(1, review.text)}</div>

      ${
        review.addendum
          ? html`
              <h2>${t('addendumTitle')()}</h2>

              ${fixHeadingLevels(2, review.addendum)}
            `
          : ''
      }

      <article aria-labelledby="comments-title">
        <h2 id="comments-title">${t('commentsTitle')()}</h2>

        <a href="${Routes.WriteComment.href({ id })}" class="button">${t('writeCommentButton')()}</a>

        ${Array.match(comments, {
          onEmpty: () => html`<p>${t('noComments')()}</p>`,
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
                            ${t('commentItemTitle')({
                              author: matchPersona(item.author, {
                                onPublic: Struct.get('displayName'),
                                onPseudonym: Struct.get('pseudonym'),
                              }),
                              authors: 1,
                            })}
                          </h3>

                          <div class="byline">
                            ${t('commentItemAuthors')({
                              authors: pipe(Array.of(item.author), Array.map(displayPersona), formatList(locale)),
                              hide: text => html`<span class="visually-hidden">${text}</span>`,
                            })}
                          </div>

                          <dl>
                            <div>
                              <dt>${t('published')()}</dt>
                              <dd>${renderDate(locale)(item.publishedAt.toZonedDateTimeISO('UTC').toPlainDate())}</dd>
                            </div>
                            <div>
                              <dt translate="no">DOI</dt>
                              <dd>
                                <a href="${toUrl(item.doi).href}" class="doi" dir="auto" translate="no">${item.doi}</a>
                              </dd>
                            </div>
                            <div>
                              <dt>${t('license')()}</dt>
                              <dd>
                                ${Match.value(item.license).pipe(
                                  Match.literalsExhaustive({
                                    'CC-BY-4.0': () => html`
                                      <a href="https://creativecommons.org/licenses/by/4.0/">
                                        <dfn>
                                          <abbr title="${t('licenseCcBy40')()}"
                                            ><bdi translate="no">CC BY 4.0</bdi></abbr
                                          >
                                        </dfn>
                                      </a>
                                    `,
                                  }),
                                )}
                              </dd>
                            </div>
                          </dl>
                        </header>

                        <div>
                          ${fixHeadingLevels(
                            3,
                            html`
                              <div ${languageAttributesFor(item.language)}>${item.comment}</div>

                              <h2>${t('write-comment-flow', 'competingInterestsHeading')()}</h2>

                              ${Option.match(item.competingInterests, {
                                onNone: () => html`<p>${t('write-comment-flow', 'noCompetingInterests')()}</p>`,
                                onSome: competingInterests =>
                                  html`<p ${languageAttributesFor(item.language)}>${competingInterests}</p>`,
                              })}
                            `,
                          )}
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
    canonical: Routes.Review.href({ id }),
  })
}

const displayPersona = matchPersona({
  onPublic: persona =>
    html`<a
      href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(persona.orcidId) })}"
      class="orcid"
      dir="auto"
      >${persona.displayName}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(persona.pseudonym) })}" dir="auto"
      >${persona.pseudonym}</a
    >`,
})

function displayAuthor({ name, orcid }: { name: Name; orcid?: OrcidId }) {
  if (orcid) {
    return html`<a
      href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}"
      class="orcid"
      dir="auto"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}" dir="auto"
      >${name}</a
    >`
  }

  return html`<bdi>${name}</bdi>`
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
