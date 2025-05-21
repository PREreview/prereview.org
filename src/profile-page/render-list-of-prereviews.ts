import { Array, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import rtlDetect from 'rtl-detect'
import { getClubName } from '../club-details.js'
import { type Html, html, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import * as PreprintServers from '../PreprintServers/index.js'
import { reviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import type { NonEmptyString } from '../types/string.js'
import { getSubfieldName } from '../types/subfield.js'
import type { Prereviews } from './prereviews.js'

export function renderListOfPrereviews(
  prereviews: Prereviews,
  name: NonEmptyString | undefined,
  locale: SupportedLocale,
) {
  return pipe(
    prereviews,
    RA.match(
      () => html`
        <div class="inset">
          <p>
            ${name
              ? translate(locale, 'profile-page', 'noResults')({ name })
              : translate(locale, 'profile-page', 'noResultsAnonymous')()}
          </p>

          <p>${translate(locale, 'profile-page', 'appearHere')()}</p>
        </div>
      `,
      prereviews => html`
        <ol class="cards">
          ${prereviews.map(
            prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${rawHtml(
                      prereview.club
                        ? translate(
                            locale,
                            'reviews-list',
                            'clubReviewText',
                          )({
                            club: html`<b>${getClubName(prereview.club)}</b>`.toString(),
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
                              Array.map(name => html`<b>${name}</b>`),
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
                              Array.map(name => html`<b>${name}</b>`),
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
      `,
    ),
  )
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
