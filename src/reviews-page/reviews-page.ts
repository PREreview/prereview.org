import { format } from 'fp-ts-routing'
import * as Ord from 'fp-ts/lib/Ord.js'
import { type Ordering, sign } from 'fp-ts/lib/Ordering.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { snd } from 'fp-ts/lib/ReadonlyTuple.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { isString } from 'fp-ts/lib/string.js'
import iso6391, { type LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, html, plainText, rawHtml } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
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
    extraSkipLink: [html`Skip to results`, '#results'],
    main: html`
      <h1>Recent PREreviews</h1>

      ${form({ canUseSearchQueries, field, language, locale, query })}

      <ol class="cards" id="results">
        ${pipe(
          recentPrereviews,
          RNEA.map(
            prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${formatList(locale)(prereview.reviewers)}
                    ${prereview.club ? html`of the <b>${getClubName(prereview.club)}</b>` : ''} reviewed
                    <cite
                      dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                      lang="${prereview.preprint.language}"
                      >${prereview.preprint.title}</cite
                    >
                  </a>

                  ${prereview.subfields.length > 0
                    ? html`
                        <ul class="categories">
                          ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield)}</li>`)}
                        </ul>
                      `
                    : ''}

                  <dl>
                    <dt>Review published</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>Preprint server</dt>
                    <dd>
                      ${match(prereview.preprint.id.type)
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
              >Newer</a
            >`
          : ''}
        ${currentPage < totalPages
          ? html`<a
              href="${format(reviewsMatch.formatter, { page: currentPage + 1, field, language, query })}"
              rel="next"
              >Older</a
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
    extraSkipLink: [html`Skip to results`, '#results'],
    main: html`
      <h1>Recent PREreviews</h1>

      ${form({ canUseSearchQueries, field, language, locale, query })}

      <div class="inset" id="results">
        <p>No PREreviews have been published yet.</p>

        <p>When they do, they’ll appear here.</p>
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
  const details = RA.append(`page ${currentPage}`)(
    [query, field ? getFieldName(field) : undefined, language ? iso6391.getName(language) : undefined].filter(isString),
  )

  return plainText`Recent PREreviews (${formatList(locale, { style: 'narrow' })(details)})`
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
    <h2 class="visually-hidden" id="filter-label">Filter</h2>
    <input type="hidden" name="page" value="1" />
    ${canUseSearchQueries
      ? html`<div>
          <label for="query">Title or author</label>
          <input type="text" name="query" id="query" ${query === undefined ? '' : html`value="${query}"`} />
        </div>`
      : query
        ? html`<input type="hidden" name="query" value="${query}" />`
        : ''}
    <div>
      <label for="language">Language</label>
      <div class="select">
        <select name="language" id="language">
          <option value="" ${language === undefined ? html`selected` : ''}>Any</option>
          ${pipe(
            ['en', 'pt', 'es'] satisfies ReadonlyArray<LanguageCode>,
            RA.map(language => [language, iso6391.getName(language)] as const),
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
      <label for="field">Field</label>
      <div class="select">
        <select name="field" id="field">
          <option value="" ${field === undefined ? html`selected` : ''}>Any</option>
          ${pipe(
            fieldIds,
            RA.map(field => [field, getFieldName(field)] satisfies [FieldId, string]),
            RA.sort(Ord.contramap(snd)(ordString(locale))),
            RA.map(([id, name]) => html` <option value="${id}" ${id === field ? html`selected` : ''}>${name}</option>`),
          )}
        </select>
      </div>
    </div>
    <button>Filter results</button>
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
