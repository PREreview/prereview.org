import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const UnsupportedDoiPage = ({ locale }: { locale: SupportedLocale }) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(t('unsupportedDoi')()),
    main: html`
      <h1>${t('unsupportedDoi')()}</h1>

      <p>${t('supportDatasetsFrom')()}</p>

      <p>
        ${rawHtml(
          t('doiIsForDataset')({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
        )}
      </p>

      <a href="${Routes.ReviewADataset}" class="button">${translate(locale, 'forms', 'backLink')()}</a>
    `,
  })
}
