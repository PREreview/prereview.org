import { format } from 'fp-ts-routing'
import * as Ord from 'fp-ts/lib/Ord.js'
import { type Ordering, sign } from 'fp-ts/lib/Ordering.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { snd } from 'fp-ts/lib/ReadonlyTuple.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { isString } from 'fp-ts/lib/string.js'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewMatch, reviewsMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { type FieldId, fieldIds, getFieldName } from '../types/field.js'
import type { NonEmptyString } from '../types/string.js'
import { getSubfieldName } from '../types/subfield.js'
import type { RecentPrereviews } from './recent-prereviews.js'

export const createPage = (
  { currentPage, field, language, query, totalPages, recentPrereviews }: RecentPrereviews,
  canUseSearchQueries: boolean,
  locale: SupportedLocale,
) =>
  PageResponse({
    title: title({ currentPage, field, language, locale, query }),
    extraSkipLink: [html`${translate(locale, 'reviews-page', 'skipResults')()}`, '#results'],
    main: html`
      <h1>${translate(locale, 'reviews-page', 'title')()}</h1>

      ${form({ canUseSearchQueries, field, language, locale, query })}

      <ol class="cards" id="results">
        ${pipe(
          recentPrereviews,
          RNEA.map(
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
                            reviewers: formatList(locale)(prereview.reviewers).toString(),
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
                            reviewers: formatList(locale)(prereview.reviewers).toString(),
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
                          ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`)}
                        </ul>
                      `
                    : ''}

                  <dl>
                    <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                    <dd>
                      ${match(prereview.preprint.id.type)
                        .with('advance', () => 'Advance')
                        .with('africarxiv', () => 'AfricArXiv Preprints')
                        .with('arcadia-science', () => 'Arcadia Science')
                        .with('arxiv', () => 'arXiv')
                        .with('authorea', () => 'Authorea')
                        .with('biorxiv', () => 'bioRxiv')
                        .with('chemrxiv', () => 'ChemRxiv')
                        .with('curvenote', () => 'Curvenote')
                        .with('eartharxiv', () => 'EarthArXiv')
                        .with('ecoevorxiv', () => 'EcoEvoRxiv')
                        .with('edarxiv', () => 'EdArXiv')
                        .with('engrxiv', () => 'engrXiv')
                        .with('medrxiv', () => 'medRxiv')
                        .with('metaarxiv', () => 'MetaArXiv')
                        .with('osf', () => 'OSF')
                        .with('osf-preprints', () => 'OSF Preprints')
                        .with('philsci', () => 'PhilSci-Archive')
                        .with('preprints.org', () => 'Preprints.org')
                        .with('psyarxiv', () => 'PsyArXiv')
                        .with('psycharchives', () => 'PsychArchives')
                        .with('research-square', () => 'Research Square')
                        .with('scielo', () => 'SciELO Preprints')
                        .with('science-open', () => 'ScienceOpen Preprints')
                        .with('socarxiv', () => 'SocArXiv')
                        .with('techrxiv', () => 'TechRxiv')
                        .with('verixiv', () => 'VeriXiv')
                        .with('zenodo', () => 'Zenodo')
                        .exhaustive()}
                    </dd>
                  </dl>
                </article>
              </li>
            `,
          ),
        )}
      </ol>

      <nav class="pager">
        ${currentPage > 1
          ? html`<a
              href="${format(reviewsMatch.formatter, { page: currentPage - 1, field, language, query })}"
              rel="prev"
              >${translate(locale, 'reviews-page', 'pagerNewer')()}</a
            >`
          : ''}
        ${currentPage < totalPages
          ? html`<a
              href="${format(reviewsMatch.formatter, { page: currentPage + 1, field, language, query })}"
              rel="next"
              >${translate(locale, 'reviews-page', 'pagerOlder')()}</a
            >`
          : ''}
      </nav>
    `,
    canonical: format(reviewsMatch.formatter, { page: currentPage, field, language, query }),
    current: 'reviews',
  })

export const emptyPage = (
  { field, language, query }: { field?: FieldId; language?: LanguageCode; query?: NonEmptyString },
  canUseSearchQueries: boolean,
  locale: SupportedLocale,
) =>
  PageResponse({
    title: title({ currentPage: 1, field, language, locale, query }),
    extraSkipLink: [html`${translate(locale, 'reviews-page', 'skipResults')()}`, '#results'],
    main: html`
      <h1>${translate(locale, 'reviews-page', 'title')()}</h1>

      ${form({ canUseSearchQueries, field, language, locale, query })}

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
}: Pick<RecentPrereviews, 'currentPage' | 'field' | 'language' | 'query'> & { locale: SupportedLocale }) => {
  const details = RA.append(translate(locale, 'reviews-page', 'pageNumber')({ page: currentPage }))(
    [
      query,
      field ? getFieldName(field, locale) : undefined,
      language ? new Intl.DisplayNames(locale, { type: 'language' }).of(language) : undefined,
    ].filter(isString),
  )

  return plainText(
    translate(
      locale,
      'reviews-page',
      'titleWithDetails',
    )({ details: formatList(locale, { style: 'narrow' })(details).toString() }),
  )
}

const form = ({
  canUseSearchQueries,
  field,
  language,
  locale,
  query,
}: Pick<RecentPrereviews, 'field' | 'language' | 'query'> & {
  canUseSearchQueries: boolean
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
    ${canUseSearchQueries
      ? html`<div>
          <label for="query">${translate(locale, 'reviews-page', 'filterTitleAuthorLabel')()}</label>
          <input type="text" name="query" id="query" ${query === undefined ? '' : html`value="${query}"`} />
        </div>`
      : query
        ? html`<input type="hidden" name="query" value="${query}" />`
        : ''}
    <div>
      <label for="language">${translate(locale, 'reviews-page', 'filterLanguageLabel')()}</label>
      <div class="select">
        <select name="language" id="language">
          <option value="" ${language === undefined ? html`selected` : ''}>
            ${translate(locale, 'reviews-page', 'filterLanguageAny')()}
          </option>
          ${pipe(
            ['en', 'pt', 'es'] satisfies ReadonlyArray<LanguageCode>,
            RA.map(
              language =>
                [language, new Intl.DisplayNames(locale, { type: 'language' }).of(language) ?? language] as const,
            ),
            RA.sort(Ord.contramap(snd)(ordString(locale))),
            RA.map(
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
            RA.map(field => [field, getFieldName(field, locale)] satisfies [FieldId, string]),
            RA.sort(Ord.contramap(snd)(ordString(locale))),
            RA.map(([id, name]) => html` <option value="${id}" ${id === field ? html`selected` : ''}>${name}</option>`),
          )}
        </select>
      </div>
    </div>
    <button>${translate(locale, 'reviews-page', 'filterButton')()}</button>
  </form>
`

const ordString = flow(localeCompare, Ord.fromCompare)

function localeCompare(...args: ConstructorParameters<typeof Intl.Collator>): (a: string, b: string) => Ordering {
  const collator = new Intl.Collator(...args)

  return flow((a, b) => collator.compare(a, b), sign)
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`<b>${item}</b>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
