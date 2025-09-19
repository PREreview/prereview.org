import rtlDetect from 'rtl-detect'
import type * as Datasets from '../../Datasets/index.js'
import { html, plainText } from '../../html.js'
import { PageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const CarryOnPage = ({
  dataset,
  datasetReviewId,
  nextRoute,
}: {
  dataset: Datasets.DatasetTitle
  datasetReviewId: Uuid.Uuid
  nextRoute: Routes.Route<{ datasetReviewId: Uuid.Uuid }>
}) =>
  PageResponse({
    title: plainText`Review a dataset`,
    main: html`
      <h1>Review a dataset</h1>

      <p>
        As you’ve already started a PREreview of
        <cite lang="${dataset.language}" dir="${rtlDetect.getLangDir(dataset.language)}">${dataset.title}</cite>, we’ll
        take you to the next step so you can carry&nbsp;on.
      </p>

      <a href="${nextRoute.href({ datasetReviewId })}" role="button" draggable="false">Continue</a>
    `,
    canonical: Routes.ReviewThisDatasetStartNow,
  })
