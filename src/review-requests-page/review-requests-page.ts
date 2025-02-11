import { flow, Number, Order, pipe, String, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import * as EffectToFpts from '../EffectToFpts.js'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewRequestsMatch, writeReviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { type FieldId, fieldIds, getFieldName } from '../types/field.js'
import { getSubfieldName } from '../types/subfield.js'
import type { ReviewRequests } from './review-requests.js'

export const createPage = ({
  currentPage,
  totalPages,
  language,
  locale,
  field,
  reviewRequests,
}: ReviewRequests & { locale: SupportedLocale }) =>
  PageResponse({
    title: title({ currentPage, field, language, locale }),
    extraSkipLink: [html`${translate(locale, 'review-requests-page', 'skipResults')()}`, '#results'],
    main: html`
      <h1>${translate(locale, 'review-requests-page', 'title')()}</h1>

      ${form({ field, language, locale })}

      <ol class="cards" id="results">
        ${reviewRequests.map(
          (request, index) => html`
            <li>
              <article aria-labelledby="request-${index}-title">
                <h2 id="request-${index}-title" class="visually-hidden">
                  ${rawHtml(
                    translate(
                      locale,
                      'requests-list',
                      'requestTitle',
                    )({
                      preprint: html`<cite
                        dir="${rtlDetect.getLangDir(request.preprint.language)}"
                        lang="${request.preprint.language}"
                        >${request.preprint.title}</cite
                      >`.toString(),
                    }),
                  )}
                </h2>

                <a
                  href="${format(writeReviewMatch.formatter, {
                    id: request.preprint.id,
                  })}"
                  >${rawHtml(
                    translate(
                      locale,
                      'requests-list',
                      'requestText',
                    )({
                      preprint: html`<cite
                        dir="${rtlDetect.getLangDir(request.preprint.language)}"
                        lang="${request.preprint.language}"
                        >${request.preprint.title}</cite
                      >`.toString(),
                    }),
                  )}
                </a>

                ${request.subfields.length > 0
                  ? html`
                      <ul class="categories">
                        ${request.subfields.map(
                          subfield => html`<li><span>${getSubfieldName(subfield, locale)}</span></li>`,
                        )}
                      </ul>
                    `
                  : ''}

                <dl>
                  <dt>${translate(locale, 'requests-list', 'requestPublished')()}</dt>
                  <dd>${renderDate(locale)(request.published)}</dd>
                  <dt>${translate(locale, 'requests-list', 'requestServer')()}</dt>
                  <dd>
                    ${match(request.preprint.id.type)
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
                      .with('jxiv', () => 'Jxiv')
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
        )}
      </ol>

      <nav class="pager">
        ${currentPage > 1
          ? html`<a
              href="${format(reviewRequestsMatch.formatter, { page: currentPage - 1, field, language })}"
              rel="prev"
              >${translate(locale, 'review-requests-page', 'pagerNewer')()}</a
            >`
          : ''}
        ${currentPage < totalPages
          ? html`<a
              href="${format(reviewRequestsMatch.formatter, { page: currentPage + 1, field, language })}"
              rel="next"
              >${translate(locale, 'review-requests-page', 'pagerOlder')()}</a
            >`
          : ''}
      </nav>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: currentPage, field, language }),
    current: 'review-requests',
  })

export const createEmptyPage = ({
  field,
  language,
  locale,
}: Pick<ReviewRequests, 'field' | 'language'> & { locale: SupportedLocale }) =>
  PageResponse({
    title: title({ currentPage: 1, field, language, locale }),
    extraSkipLink: [html`${translate(locale, 'review-requests-page', 'skipResults')()}`, '#results'],
    main: html`
      <h1>${translate(locale, 'review-requests-page', 'title')()}</h1>

      ${form({ field, language, locale })}

      <div class="inset" id="results">
        <p>${translate(locale, 'review-requests-page', 'noResults')()}</p>

        <p>${translate(locale, 'review-requests-page', 'appearHere')()}</p>
      </div>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: 1, field, language }),
    current: 'review-requests',
  })

const title = ({
  currentPage,
  field,
  language,
  locale,
}: Pick<ReviewRequests, 'currentPage' | 'field' | 'language'> & { locale: SupportedLocale }) => {
  const details = RA.append(translate(locale, 'review-requests-page', 'pageNumber')({ page: currentPage }))(
    [
      field ? getFieldName(field, locale) : undefined,
      language ? new Intl.DisplayNames(locale, { type: 'language' }).of(language) : undefined,
    ].filter(String.isString),
  )

  return plainText(
    translate(
      locale,
      'review-requests-page',
      'titleWithDetails',
    )({ details: formatList(locale, { style: 'narrow' })(details).toString() }),
  )
}

const form = ({
  field,
  language,
  locale,
}: Pick<ReviewRequests, 'field' | 'language'> & { locale: SupportedLocale }) => html`
  <form
    method="get"
    action="${format(reviewRequestsMatch.formatter, {})}"
    novalidate
    role="search"
    aria-labelledby="filter-label"
  >
    <h2 class="visually-hidden" id="filter-label">${translate(locale, 'review-requests-page', 'filterTitle')()}</h2>
    <input type="hidden" name="page" value="1" />
    <div>
      <label for="language">${translate(locale, 'review-requests-page', 'filterLanguageLabel')()}</label>
      <div class="select">
        <select name="language" id="language">
          <option value="" ${language === undefined ? html`selected` : ''}>
            ${translate(locale, 'review-requests-page', 'filterLanguageAny')()}
          </option>
          ${pipe(
            ['en', 'pt', 'es'] satisfies ReadonlyArray<LanguageCode>,
            RA.map(
              language =>
                [language, new Intl.DisplayNames(locale, { type: 'language' }).of(language) ?? language] as const,
            ),
            RA.sort(EffectToFpts.ord<readonly [string, string]>(Order.mapInput(StringOrder(locale), Tuple.getSecond))),
            RA.map(
              ([code, name]) =>
                html` <option value="${code}" ${code === language ? html`selected` : ''}>${name}</option>`,
            ),
          )}
        </select>
      </div>
    </div>
    <div>
      <label for="field">${translate(locale, 'review-requests-page', 'filterFieldLabel')()}</label>
      <div class="select">
        <select name="field" id="field">
          <option value="" ${field === undefined ? html`selected` : ''}>
            ${translate(locale, 'review-requests-page', 'filterFieldAny')()}
          </option>
          ${pipe(
            fieldIds,
            RA.map(field => [field, getFieldName(field, locale)] satisfies [FieldId, string]),
            RA.sort(EffectToFpts.ord<readonly [string, string]>(Order.mapInput(StringOrder(locale), Tuple.getSecond))),
            RA.map(([id, name]) => html` <option value="${id}" ${id === field ? html`selected` : ''}>${name}</option>`),
          )}
        </select>
      </div>
    </div>
    <button>${translate(locale, 'review-requests-page', 'filterButton')()}</button>
  </form>
`

function StringOrder(...args: ConstructorParameters<typeof Intl.Collator>): Order.Order<string> {
  const collator = new Intl.Collator(...args)

  return flow((a, b) => collator.compare(a, b), Number.sign)
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(list => formatter.format(list), rawHtml)
}
