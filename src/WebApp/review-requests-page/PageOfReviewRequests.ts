import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type * as ReviewRequests from '../../ReviewRequests/index.ts'
import { reviewRequestsMatch, writeReviewMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import { PageResponse } from '../Response/index.ts'
import { form, title } from './Page.ts'

export const PageOfReviewRequests = ({
  currentPage,
  totalPages,
  language,
  locale,
  field,
  reviewRequests,
}: ReviewRequests.PageOfReviewRequests & { locale: SupportedLocale }) => {
  const t = translate(locale, 'review-requests-page')

  return PageResponse({
    title: title({ currentPage, field, language, locale }),
    extraSkipLink: [html`${t('skipResults')()}`, '#results'],
    main: html`
      <h1>${t('title')()}</h1>

      ${form({ field, language, locale })}

      <ol class="cards" id="results">
        ${reviewRequests.map(
          (request, index) => html`
            <li>
              <article aria-labelledby="request-${index}-title">
                <h2 id="request-${index}-title" class="visually-hidden">
                  ${rawHtml(
                    t(
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
                    t(
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
                  <dt>${t('requests-list', 'requestPublished')()}</dt>
                  <dd>${renderDate(locale)(request.published)}</dd>
                  <dt>${t('requests-list', 'requestServer')()}</dt>
                  <dd>${Preprints.getServerName(request.preprint.id)}</dd>
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
              >${t('pagerNewer')()}</a
            >`
          : ''}
        ${currentPage < totalPages
          ? html`<a
              href="${format(reviewRequestsMatch.formatter, { page: currentPage + 1, field, language })}"
              rel="next"
              >${t('pagerOlder')()}</a
            >`
          : ''}
      </nav>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: currentPage, field, language }),
    current: 'review-requests',
  })
}
