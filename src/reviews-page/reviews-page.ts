import { format } from 'fp-ts-routing'
import * as Ord from 'fp-ts/Ord'
import { type Ordering, sign } from 'fp-ts/Ordering'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { snd } from 'fp-ts/ReadonlyTuple'
import { flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details'
import { type Html, html, plainText, rawHtml } from '../html'
import { PageResponse } from '../response'
import { reviewMatch, reviewsMatch } from '../routes'
import { renderDate } from '../time'
import { type FieldId, fieldIds, getFieldName } from '../types/field'
import { getSubfieldName } from '../types/subfield'
import type { RecentPrereviews } from './recent-prereviews'

export const createPage = ({ currentPage, field, totalPages, recentPrereviews }: RecentPrereviews) =>
  PageResponse({
    title: title({ currentPage, field }),
    extraSkipLink: [html`Skip to results`, '#results'],
    main: html`
      <h1>Recent PREreviews</h1>

      ${form({ field })}

      <ol class="cards" id="results">
        ${pipe(
          recentPrereviews,
          RNEA.map(
            prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${formatList('en')(prereview.reviewers)}
                    ${prereview.club ? html`of the <b>${getClubName(prereview.club)}</b>` : ''} reviewed
                    <cite dir="${getLangDir(prereview.preprint.language)}" lang="${prereview.preprint.language}"
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
                    <dd>${renderDate(prereview.published)}</dd>
                    <dt>Preprint server</dt>
                    <dd>
                      ${match(prereview.preprint.id.type)
                        .with('africarxiv', () => 'AfricArXiv Preprints')
                        .with('arxiv', () => 'arXiv')
                        .with('authorea', () => 'Authorea')
                        .with('biorxiv', () => 'bioRxiv')
                        .with('chemrxiv', () => 'ChemRxiv')
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
          ? html`<a href="${format(reviewsMatch.formatter, { page: currentPage - 1, field })}" rel="prev">Newer</a>`
          : ''}
        ${currentPage < totalPages
          ? html`<a href="${format(reviewsMatch.formatter, { page: currentPage + 1, field })}" rel="next">Older</a>`
          : ''}
      </nav>
    `,
    canonical: format(reviewsMatch.formatter, { page: currentPage, field }),
    current: 'reviews',
  })

export const emptyPage = ({ field }: { field?: FieldId } = {}) =>
  PageResponse({
    title: title({ currentPage: 1, field }),
    extraSkipLink: [html`Skip to results`, '#results'],
    main: html`
      <h1>Recent PREreviews</h1>

      ${form({ field })}

      <div class="inset" id="results">
        <p>No PREreviews have been published yet.</p>

        <p>When they do, they’ll appear here.</p>
      </div>
    `,
    canonical: format(reviewsMatch.formatter, { page: 1, field }),
    current: 'reviews',
  })

const title = ({ currentPage, field }: Pick<RecentPrereviews, 'currentPage' | 'field'>) => {
  const details = RA.append(`page ${currentPage}`)([field ? getFieldName(field) : undefined].filter(isString))

  return plainText`Recent PREreviews (${formatList('en', { style: 'narrow' })(details)})`
}

const form = ({ field }: Pick<RecentPrereviews, 'field'>) => html`
  <form
    method="get"
    action="${format(reviewsMatch.formatter, {})}"
    novalidate
    role="search"
    aria-labelledby="filter-label"
  >
    <h2 class="visually-hidden" id="filter-label">Filter</h2>
    <input type="hidden" name="page" value="1" />
    <div>
      <label for="field">Field</label>
      <select name="field" id="field">
        <option value="" ${field === undefined ? html`selected` : ''}>Any</option>
        ${pipe(
          fieldIds,
          RA.map(field => [field, getFieldName(field)] satisfies [FieldId, string]),
          RA.sort(Ord.contramap(snd)(ordString('en'))),
          RA.map(([id, name]) => html` <option value="${id}" ${id === field ? html`selected` : ''}>${name}</option>`),
        )}
      </select>
    </div>
    <button>Filter results</button>
  </form>
`

const ordString = (locale: LanguageCode) => Ord.fromCompare(localeCompare(locale))

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
