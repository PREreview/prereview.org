import { format } from 'fp-ts-routing'
import * as Ord from 'fp-ts/Ord'
import { type Ordering, sign } from 'fp-ts/Ordering'
import * as RA from 'fp-ts/ReadonlyArray'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { snd } from 'fp-ts/ReadonlyTuple'
import { flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { PageResponse } from '../response.js'
import { reviewRequestsMatch, writeReviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { type FieldId, fieldIds, getFieldName } from '../types/field.js'
import { getSubfieldName } from '../types/subfield.js'
import type { ReviewRequests } from './review-requests.js'

export const createPage = ({ currentPage, totalPages, language, field, reviewRequests }: ReviewRequests) =>
  PageResponse({
    title: title({ currentPage, field, language }),
    extraSkipLink: [html`Skip to results`, '#results'],
    main: html`
      <h1>Recent review requests</h1>

      ${form({ field, language })}

      <ol class="cards" id="results">
        ${reviewRequests.map(
          (request, index) => html`
            <li>
              <article aria-labelledby="request-${index}-title">
                <h2 id="request-${index}-title" class="visually-hidden">
                  Review request for
                  <cite dir="${getLangDir(request.preprint.language)}" lang="${request.preprint.language}"
                    >${request.preprint.title}</cite
                  >
                </h2>

                <a
                  href="${format(writeReviewMatch.formatter, {
                    id: request.preprint.id,
                  })}"
                >
                  A review was requested for
                  <cite dir="${getLangDir(request.preprint.language)}" lang="${request.preprint.language}"
                    >${request.preprint.title}</cite
                  >
                </a>

                ${request.subfields.length > 0
                  ? html`
                      <ul class="categories">
                        ${request.subfields.map(subfield => html` <li>${getSubfieldName(subfield)}</li>`)}
                      </ul>
                    `
                  : ''}

                <dl>
                  <dt>Review published</dt>
                  <dd>${renderDate(request.published)}</dd>
                  <dt>Preprint server</dt>
                  <dd>
                    ${match(request.preprint.id.type)
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
        )}
      </ol>

      <nav class="pager">
        ${currentPage > 1
          ? html`<a
              href="${format(reviewRequestsMatch.formatter, { page: currentPage - 1, field, language })}"
              rel="prev"
              >Newer</a
            >`
          : ''}
        ${currentPage < totalPages
          ? html`<a
              href="${format(reviewRequestsMatch.formatter, { page: currentPage + 1, field, language })}"
              rel="next"
              >Older</a
            >`
          : ''}
      </nav>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: currentPage, field, language }),
    current: 'review-requests',
  })

export const createEmptyPage = ({ field, language }: Pick<ReviewRequests, 'field' | 'language'>) =>
  PageResponse({
    title: title({ currentPage: 1, field, language }),
    extraSkipLink: [html`Skip to results`, '#results'],
    main: html`
      <h1>Recent review requests</h1>

      ${form({ field, language })}

      <div class="inset" id="results">
        <p>No review requests have been published yet.</p>

        <p>When they do, they’ll appear here.</p>
      </div>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: 1, field, language }),
    current: 'review-requests',
  })

const title = ({ currentPage, field, language }: Pick<ReviewRequests, 'currentPage' | 'field' | 'language'>) => {
  const details = RA.append(`page ${currentPage}`)(
    [field ? getFieldName(field) : undefined, language ? iso6391.getName(language) : undefined].filter(isString),
  )

  return plainText`Recent review requests (${formatList('en', { style: 'narrow' })(details)})`
}

const form = ({ field, language }: Pick<ReviewRequests, 'field' | 'language'>) => html`
  <form
    method="get"
    action="${format(reviewRequestsMatch.formatter, {})}"
    novalidate
    role="search"
    aria-labelledby="filter-label"
  >
    <h2 class="visually-hidden" id="filter-label">Filter</h2>
    <input type="hidden" name="page" value="1" />
    <div>
      <label for="language">Language</label>
      <div class="select">
        <select name="language" id="language">
          <option value="" ${language === undefined ? html`selected` : ''}>Any</option>
          ${pipe(
            ['en', 'pt', 'es'] satisfies ReadonlyArray<LanguageCode>,
            RA.map(language => [language, iso6391.getName(language)] as const),
            RA.sort(Ord.contramap(snd)(ordString('en'))),
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
            RA.sort(Ord.contramap(snd)(ordString('en'))),
            RA.map(([id, name]) => html` <option value="${id}" ${id === field ? html`selected` : ''}>${name}</option>`),
          )}
        </select>
      </div>
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
): (list: RNEA.ReadonlyNonEmptyArray<string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(list => formatter.format(list), rawHtml)
}
