import type * as Datasets from '../../../Datasets/index.ts'
import { html, plainText } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { PageResponse } from '../../Response/index.ts'

export const CarryOnPage = ({
  dataset,
  datasetReviewId,
  locale,
  nextRoute,
}: {
  dataset: Datasets.DatasetTitle
  datasetReviewId: Uuid.Uuid
  locale: SupportedLocale
  nextRoute: Routes.Route<{ datasetReviewId: Uuid.Uuid }>
}) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    title: plainText(t('reviewADataset')()),
    main: html`
      <h1>${t('reviewADataset')()}</h1>

      <p>
        ${t('asYouHaveAlreadyStarted')({
          dataset: html`<cite ${languageAttributesFor(dataset.language)}>${dataset.title}</cite>`,
        })}
      </p>

      <a href="${nextRoute.href({ datasetReviewId })}" role="button" draggable="false"
        >${t('forms', 'continueButton')()}</a
      >
    `,
    canonical: Routes.ReviewThisDatasetStartNow.href({ datasetId: dataset.id }),
  })
}
