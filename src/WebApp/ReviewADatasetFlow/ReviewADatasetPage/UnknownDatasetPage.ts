import { Match } from 'effect'
import type * as Datasets from '../../../Datasets/index.ts'
import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const UnknownDatasetPage = ({ dataset, locale }: { dataset: Datasets.DatasetId; locale: SupportedLocale }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText('Sorry, we don’t know this dataset'),
    main: html`
      <h1>Sorry, we don’t know this dataset</h1>

      <p>
        ${Match.valueTags(dataset, {
          DryadDatasetId: () =>
            html`We think the DOI <q class="select-all" translate="no">${dataset.value}</q> could be a Dryad dataset,
              but we can’t find any details.`,
        })}
      </p>

      <p>If you typed the DOI, check it is correct.</p>

      <p>If you pasted the DOI, check you copied the entire address.</p>

      <p>If the DOI is correct, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

      <a href="${Routes.ReviewADataset}" class="button">${translate(locale, 'forms', 'backLink')()}</a>
    `,
  })
}
