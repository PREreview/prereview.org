import { Array, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { getClubName } from '../../club-details.js'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { PageResponse } from '../../response.js'
import { authorInviteDeclineMatch, clubProfileMatch, profileMatch } from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'
import { renderDate } from '../../time.js'
import { ProfileId } from '../../types/index.js'
import type { Orcid } from '../../types/Orcid.js'
import { isPseudonym } from '../../types/Pseudonym.js'
import type { Prereview } from './index.js'

export const declinePage = ({
  inviteId,
  locale,
  review,
}: {
  inviteId: Uuid
  locale: SupportedLocale
  review: Prereview
}) =>
  PageResponse({
    status: StatusCodes.OK,
    title: plainText(translate(locale, 'author-invite-flow', 'declineTheInvitation')()),
    main: html`
      <form method="post" action="${format(authorInviteDeclineMatch.formatter, { id: inviteId })}" novalidate>
        <h1>${translate(locale, 'author-invite-flow', 'declineTheInvitation')()}</h1>

        <article class="preview" tabindex="0" aria-labelledby="prereview-title">
          <header>
            <h2 id="prereview-title">
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
            </h2>

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
                            ? [
                                translate(
                                  locale,
                                  'review-page',
                                  'otherAuthors',
                                )({ otherAuthors: review.authors.anonymous }),
                              ]
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
                        Array.map(displayAuthor),
                        Array.appendAll(
                          review.authors.anonymous > 0
                            ? [
                                translate(
                                  locale,
                                  'review-page',
                                  'otherAuthors',
                                )({ otherAuthors: review.authors.anonymous }),
                              ]
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
                <dd class="doi" translate="no">${review.doi}</dd>
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
        </article>

        <p>${translate(locale, 'author-invite-flow', 'invitedToAppear')()}</p>

        <p>${translate(locale, 'author-invite-flow', 'youCanDecline')()}</p>

        <button>${translate(locale, 'author-invite-flow', 'declineTheInvitation')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
    allowRobots: false,
  })

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
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
