import { format } from 'fp-ts-routing'
import { html } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type * as ReviewRequests from '../../ReviewRequests/index.ts'
import { reviewRequestsMatch } from '../../routes.ts'
import { PageResponse } from '../Response/index.ts'
import { form, title } from './Page.ts'

export const NoResultsPage = ({
  field,
  language,
  locale,
}: Pick<ReviewRequests.PageOfReviewRequests, 'field' | 'language'> & { locale: SupportedLocale }) => {
  const t = translate(locale, 'review-requests-page')

  return PageResponse({
    title: title({ currentPage: 1, field, language, locale }),
    extraSkipLink: [html`${t('skipResults')()}`, '#results'],
    main: html`
      <h1>${t('title')()}</h1>

      ${form({ field, language, locale })}

      <div class="inset" id="results">
        <p>${t('noResults')()}</p>

        <p>${t('appearHere')()}</p>
      </div>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: 1, field, language }),
    current: 'review-requests',
  })
}
