import { Array, flow, Match, Number, Order, pipe, String, Struct, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import type { LanguageCode } from 'iso-639-1'
import { getClubName } from '../../Clubs/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { type Html, html, plainText, rawHtml } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import type * as Prereviews from '../../Prereviews/index.ts'
import * as Routes from '../../routes.ts'
import { reviewMatch, reviewsMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { type FieldId, fieldIds, getFieldName } from '../../types/field.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import { PageResponse } from '../Response/index.ts'

export const createPage = (
  { currentPage, field, language, query, totalPages, recentPrereviews }: Prereviews.RecentPrereviews,
  locale: SupportedLocale,
) =>
  PageResponse({
    title: title({ currentPage, field, language, locale, query }),
    extraSkipLink: [html`${translate(locale, 'reviews-page', 'skipResults')()}`, '#results'],
    main: html`
      <h1>${translate(locale, 'reviews-page', 'title')()}</h1>

      ${form({ field, language, locale, query })}

      <ol class="cards" id="results">
        ${Array.map(
          recentPrereviews,
          Match.valueTags({
            RecentPreprintPrereview: prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${
                      prereview.club
                        ? translate(
                            locale,
                            'reviews-list',
                            'clubReviewText',
                          )({
                            club: html`<b ${languageAttributesFor(getClubName(prereview.club).language)}
                              >${getClubName(prereview.club).text}</b
                            >`,
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
                            ),
                            preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
                              >${prereview.preprint.title}</cite
                            >`,
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
                            ),
                            preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
                              >${prereview.preprint.title}</cite
                            >`,
                          })
                    }
                  </a>

                  ${
                    prereview.subfields.length > 0
                      ? html`
                          <ul class="categories">
                            ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`)}
                          </ul>
                        `
                      : ''
                  }

                  <dl>
                    <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                    <dd>${Preprints.getServerName(prereview.preprint.id)}</dd>
                  </dl>
                </article>
              </li>
            `,
            RecentDatasetPrereview: prereview => html`
              <li>
                <article>
                  <a href="${Routes.DatasetReview.href({ datasetReviewId: prereview.id })}">
                    ${
                      prereview.club
                        ? translate(
                            locale,
                            'dataset-reviews-list',
                            'reviewTextInClub',
                          )({
                            club: html`<b ${languageAttributesFor(getClubName(prereview.club).language)}
                              >${getClubName(prereview.club).text}</b
                            >`,
                            numberOfReviewers: 1 + prereview.otherAuthors.length + prereview.anonymousAuthors,
                            reviewer: authorList(prereview, locale),
                            dataset: html`<cite ${languageAttributesFor(prereview.dataset.language)}
                              >${prereview.dataset.title}</cite
                            >`,
                          })
                        : translate(
                            locale,
                            'dataset-reviews-list',
                            'reviewText',
                          )({
                            numberOfReviewers: 1 + prereview.otherAuthors.length + prereview.anonymousAuthors,
                            reviewer: authorList(prereview, locale),
                            dataset: html`<cite ${languageAttributesFor(prereview.dataset.language)}
                              >${prereview.dataset.title}</cite
                            >`,
                          })
                    }
                  </a>

                  <dl>
                    <dt>${translate(locale, 'dataset-reviews-list', 'reviewPublished')()}</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>${translate(locale, 'dataset-reviews-list', 'repository')()}</dt>
                    <dd>${Datasets.getRepositoryName(prereview.dataset.id)}</dd>
                  </dl>
                </article>
              </li>
            `,
          }),
        )}
      </ol>

      <nav class="pager">
        ${
          currentPage > 1
            ? html`<a
                href="${format(reviewsMatch.formatter, { page: currentPage - 1, field, language, query })}"
                rel="prev"
                >${translate(locale, 'reviews-page', 'pagerNewer')()}</a
              >`
            : ''
        }
        ${
          currentPage < totalPages
            ? html`<a
                href="${format(reviewsMatch.formatter, { page: currentPage + 1, field, language, query })}"
                rel="next"
                >${translate(locale, 'reviews-page', 'pagerOlder')()}</a
              >`
            : ''
        }
      </nav>
    `,
    canonical: format(reviewsMatch.formatter, { page: currentPage, field, language, query }),
    current: 'reviews',
  })

export const emptyPage = (
  { field, language, query }: { field?: FieldId; language?: LanguageCode; query?: NonEmptyString },
  locale: SupportedLocale,
) =>
  PageResponse({
    title: title({ currentPage: 1, field, language, locale, query }),
    extraSkipLink: [html`${translate(locale, 'reviews-page', 'skipResults')()}`, '#results'],
    main: html`
      <h1>${translate(locale, 'reviews-page', 'title')()}</h1>

      ${form({ field, language, locale, query })}

      <div class="inset" id="results">
        <p>${translate(locale, 'reviews-page', 'noResults')()}</p>

        <p>${translate(locale, 'reviews-page', 'appearHere')()}</p>
      </div>
    `,
    canonical: format(reviewsMatch.formatter, { page: 1, field, language, query }),
    current: 'reviews',
  })

const title = ({
  currentPage,
  field,
  language,
  locale,
  query,
}: Pick<Prereviews.RecentPrereviews, 'currentPage' | 'field' | 'language' | 'query'> & { locale: SupportedLocale }) => {
  const details = Array.append(
    [
      query,
      field ? plainText(getFieldName(field, locale)).toString() : undefined,
      language ? new Intl.DisplayNames(locale, { type: 'language' }).of(language) : undefined,
    ].filter(String.isString),
    translate(locale, 'reviews-page', 'pageNumber')({ page: currentPage }),
  )

  return plainText(
    translate(
      locale,
      'reviews-page',
      'titleWithDetails',
    )({ details: formatList(locale, { style: 'narrow' })(details) }),
  )
}

const form = ({
  field,
  language,
  locale,
  query,
}: Pick<Prereviews.RecentPrereviews, 'field' | 'language' | 'query'> & {
  locale: SupportedLocale
}) => html`
  <form
    method="get"
    action="${format(reviewsMatch.formatter, {})}"
    novalidate
    role="search"
    aria-labelledby="filter-label"
  >
    <h2 class="visually-hidden" id="filter-label">${translate(locale, 'reviews-page', 'filterTitle')()}</h2>
    <input type="hidden" name="page" value="1" />
    <div>
      <label for="query">${translate(locale, 'reviews-page', 'filterTitleAuthorLabel')()}</label>
      <input
        type="text"
        placeholder=" "
        dir="auto"
        name="query"
        id="query"
        ${query === undefined ? '' : html`value="${query}"`}
      />
    </div>
    <div>
      <label for="language">${translate(locale, 'reviews-page', 'filterLanguageLabel')()}</label>
      <div class="select">
        <select name="language" id="language">
          <option value="" ${language === undefined ? html`selected` : ''}>
            ${translate(locale, 'reviews-page', 'filterLanguageAny')()}
          </option>
          ${pipe(
            ['en', 'pt', 'es'] satisfies ReadonlyArray<LanguageCode>,
            Array.map(
              language =>
                [language, new Intl.DisplayNames(locale, { type: 'language' }).of(language) ?? language] as const,
            ),
            Array.sort<readonly [string, string]>(Order.mapInput(StringOrder(locale), Tuple.getSecond)),
            Array.map(
              ([code, name]) =>
                html` <option value="${code}" ${code === language ? html`selected` : ''}>${name}</option>`,
            ),
          )}
        </select>
      </div>
    </div>
    <div>
      <label for="field">${translate(locale, 'reviews-page', 'filterFieldLabel')()}</label>
      <div class="select">
        <select name="field" id="field">
          <option value="" ${field === undefined ? html`selected` : ''}>
            ${translate(locale, 'reviews-page', 'filterFieldAny')()}
          </option>
          ${pipe(
            fieldIds,
            Array.map(field => [field, getFieldName(field, locale)] satisfies [FieldId, Html]),
            Array.sort<readonly [string, Html]>(Order.mapInput(StringOrder(locale), ([, name]) => name.toString())),
            Array.map(
              ([id, name]) => html` <option value="${id}" ${id === field ? html`selected` : ''}>${name}</option>`,
            ),
          )}
        </select>
      </div>
    </div>
    <button>${translate(locale, 'reviews-page', 'filterButton')()}</button>
  </form>
`

const authorList = (datasetReview: Prereviews.RecentDatasetPrereview, locale: SupportedLocale) => {
  const list: Array.NonEmptyArray<Html | NonEmptyString> = Array.map(
    Array.make(datasetReview.author, ...datasetReview.otherAuthors),
    displayPersona,
  )

  if (datasetReview.anonymousAuthors > 0) {
    list.push(translate(locale, 'dataset-reviews-list', 'otherAuthors')({ number: datasetReview.anonymousAuthors }))
  }

  return formatList(locale)(list)
}

const displayPersona = Prereviewers.matchPersona({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})

function StringOrder(...args: ConstructorParameters<typeof Intl.Collator>): Order.Order<string> {
  const collator = new Intl.Collator(...args)

  return flow((a, b) => collator.compare(a, b), Number.sign)
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`<b dir="auto">${item}</b>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
