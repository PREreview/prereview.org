import { Match } from 'effect'
import type * as Datasets from '../../../Datasets/index.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

export const UnknownDatasetPage = ({ dataset, locale }: { dataset: Datasets.DatasetId; locale: SupportedLocale }) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(t('doNotKnowDataset')()),
    main: html`
      <h1>${t('doNotKnowDataset')()}</h1>

      <p>
        ${rawHtml(
          Match.valueTags(dataset, {
            DryadDatasetId: () => t('doiCouldBeDryad'),
            ScieloDatasetId: () => t('doiCouldBeScielo'),
            ZenodoDatasetId:
              () =>
              ({ doi }: { doi: string }) =>
                `We think the DOI ${doi} could be a Zenodo dataset, but we can’t find any details.`,
          })({ doi: html`<q class="select-all" translate="no">${dataset.value}</q>`.toString() }),
        )}
      </p>

      <p>${t('checkCorrectDoi')()}</p>

      <p>${t('checkPastedDoi')()}</p>

      <p>
        ${rawHtml(
          t('doiIsCorrect')({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
        )}
      </p>

      <a href="${Routes.ReviewADataset}" class="button">${t('forms', 'backLink')()}</a>
    `,
  })
}
