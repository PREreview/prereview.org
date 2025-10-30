import { Array, flow, Match, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { getClubName } from '../Clubs/index.ts'
import { type Html, html, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import * as Personas from '../Personas/index.ts'
import * as PreprintServers from '../PreprintServers/index.ts'
import * as Routes from '../routes.ts'
import { reviewMatch } from '../routes.ts'
import { renderDate } from '../time.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import { getSubfieldName } from '../types/subfield.ts'
import type { Prereviews } from './prereviews.ts'

export function renderListOfPrereviews(
  prereviews: Prereviews,
  name: NonEmptyString | undefined,
  locale: SupportedLocale,
) {
  return Array.match(prereviews, {
    onEmpty: () => html`
      <div class="inset">
        <p>
          ${name
            ? translate(locale, 'profile-page', 'noResults')({ name })
            : translate(locale, 'profile-page', 'noResultsAnonymous')()}
        </p>

        <p>${translate(locale, 'profile-page', 'appearHere')()}</p>
      </div>
    `,
    onNonEmpty: prereviews => html`
      <ol class="cards">
        ${prereviews.map(
          Match.valueTags({
            RecentPreprintPrereview: prereview => html`
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
            RecentDatasetPrereview: prereview => html`
              <li>
                <article>
                  <a href="${Routes.DatasetReview.href({ datasetReviewId: prereview.id })}">
                    <b>${displayPersona(prereview.author)}</b> reviewed
                    <cite dir="${rtlDetect.getLangDir(prereview.dataset.language)}" lang="${prereview.dataset.language}"
                      >${prereview.dataset.title}</cite
                    >
                  </a>

                  <dl>
                    <dt>Review published</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>Repository</dt>
                    <dd>Dryad</dd>
                  </dl>
                </article>
              </li>
            `,
          }),
        )}
      </ol>
    `,
  })
}

const displayPersona = Personas.match({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})

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
