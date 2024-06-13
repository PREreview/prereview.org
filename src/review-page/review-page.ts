import { toUrl } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../html.js'
import { PageResponse } from '../response.js'
import { clubProfileMatch, preprintReviewsMatch, profileMatch, reviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { isPseudonym } from '../types/pseudonym.js'
import type { Prereview } from './prereview.js'

export const createPage = ({ id, review }: { id: number; review: Prereview }) =>
  PageResponse({
    title: plainText`${review.structured ? 'Structured ' : ''}PREreview of “${review.preprint.title}”`,
    description: plainText`Authored by ${pipe(
      review.authors.named,
      RNEA.map(displayAuthor),
      RNEA.concatW(
        review.authors.anonymous > 0
          ? [`${review.authors.anonymous} other author${review.authors.anonymous !== 1 ? 's' : ''}`]
          : [],
      ),
      formatList('en'),
    )}${review.club ? plainText` of the ${getClubName(review.club)}` : ''}.`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: review.preprint.id })}" class="back">See other reviews</a>
      <a href="${review.preprint.url.href}" class="forward">Read the preprint</a>
    `,
    main: html`
      <header>
        <h1>
          ${review.structured ? 'Structured ' : ''}PREreview of
          <cite lang="${review.preprint.language}" dir="${getLangDir(review.preprint.language)}"
            >${review.preprint.title}</cite
          >
        </h1>

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
                <a href="${format(clubProfileMatch.formatter, { id: review.club })}">${getClubName(review.club)}</a>`
            : ''}
        </div>

        <dl>
          <div>
            <dt>Published</dt>
            <dd>${renderDate(review.published)}</dd>
          </div>
          <div>
            <dt>DOI</dt>
            <dd><a href="${toUrl(review.doi).href}" class="doi" translate="no">${review.doi}</a></dd>
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
