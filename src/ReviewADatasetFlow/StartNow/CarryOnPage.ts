import { html, plainText } from '../../html.js'
import { PageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const CarryOnPage = ({
  datasetReviewId,
  nextRoute,
}: {
  datasetReviewId: Uuid.Uuid
  nextRoute: Routes.Route<{ datasetReviewId: Uuid.Uuid }>
}) =>
  PageResponse({
    title: plainText`Review a dataset`,
    main: html`
      <h1>Review a dataset</h1>

      <p>
        As you’ve already started a PREreview of
        <cite>Metadata collected from 500 articles in the field of ecology and evolution</cite>, we’ll take you to the
        next step so you can carry&nbsp;on.
      </p>

      <a href="${nextRoute.href({ datasetReviewId })}" role="button" draggable="false">Continue</a>
    `,
    canonical: Routes.ReviewThisDatasetStartNow,
  })
