import { format } from 'fp-ts-routing'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { getClubName } from '../../club-details'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { authorInviteDeclineMatch, clubProfileMatch, profileMatch } from '../../routes'
import { renderDate } from '../../time'
import { isPseudonym } from '../../types/pseudonym'
import type { Prereview } from './index'

export const declinePage = ({ inviteId, review }: { inviteId: Uuid; review: Prereview }) =>
  StreamlinePageResponse({
    status: Status.OK,
    title: plainText`Decline the invitation`,
    main: html`
      <form method="post" action="${format(authorInviteDeclineMatch.formatter, { id: inviteId })}" novalidate>
        <h1>Decline the invitation</h1>

        <article class="preview" tabindex="0" aria-labelledby="prereview-title">
          <header>
            <h2 id="prereview-title">
              ${review.structured ? 'Structured ' : ''}PREreview of
              <cite lang="${review.preprint.language}" dir="${getLangDir(review.preprint.language)}"
                >${review.preprint.title}</cite
              >
            </h2>

            <div class="byline">
              <span class="visually-hidden">Authored</span> by
              ${pipe(
                review.authors.named,
                RNEA.map(displayAuthor),
                RNEA.concatW(
                  review.authors.anonymous > 0
                    ? [`${review.authors.anonymous} other author${review.authors.anonymous !== 1 ? 's' : ''}`]
                    : [],
                ),
                formatList('en'),
              )}
              ${review.club
                ? html`of the
                    <a href="${format(clubProfileMatch.formatter, { id: review.club })}"
                      >${getClubName(review.club)}</a
                    >`
                : ''}
            </div>

            <dl>
              <div>
                <dt>Published</dt>
                <dd>${renderDate(review.published)}</dd>
              </div>
              <div>
                <dt>DOI</dt>
                <dd class="doi" translate="no">${review.doi}</dd>
              </div>
              <div>
                <dt>License</dt>
                <dd>
                  ${match(review.license)
                    .with(
                      'CC-BY-4.0',
                      () => html`
                        <a href="https://creativecommons.org/licenses/by/4.0/">
                          <dfn>
                            <abbr title="Attribution 4.0 International"><span translate="no">CC BY 4.0</span></abbr>
                          </dfn>
                        </a>
                      `,
                    )
                    .exhaustive()}
                </dd>
              </div>
            </dl>
          </header>

          <div ${review.language ? html`lang="${review.language}" dir="${getLangDir(review.language)}"` : ''}>
            ${fixHeadingLevels(1, review.text)}
          </div>

          ${review.addendum
            ? html`
                <h2>Addendum</h2>

                ${fixHeadingLevels(2, review.addendum)}
              `
            : ''}
        </article>

        <p>You’ve been invited to appear as an author on this PREreview.</p>

        <p>You can decline this invitation and remain an anonymous author.</p>

        <button>Decline the invitation</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
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
