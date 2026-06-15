import { Array, flow } from 'effect'
import { RepositoryNames } from '../../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const UnsupportedUrlPage = ({ locale }: { locale: SupportedLocale }) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(t('unsupportedUrl')()),
    main: html`
      <h1>${t('unsupportedUrl')()}</h1>

      <p>${t('supportDatasetsFrom')({ repositories: formatList('en')(RepositoryNames) })}</p>

      <p>${t('urlIsForDataset')({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>` })}</p>

      <p>${t('tryDoi')()}</p>

      <a href="${Routes.ReviewADataset}" class="button">${t('forms', 'backLink')()}</a>
    `,
  })
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`<bdi>${item}</bdi>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
