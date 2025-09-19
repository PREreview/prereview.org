import * as StatusCodes from '../../StatusCodes.js'
import { html, plainText } from '../../html.js'
import { PageResponse } from '../../response.js'
import * as Routes from '../../routes.js'

export const NotADatasetPage = () => {
  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText('Sorry, we only support datasets'),
    main: html`
      <h1>Sorry, we only support datasets</h1>

      <p>We support datasets from Dryad.</p>

      <p>If this is a dataset, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

      <a href="${Routes.ReviewADataset}" class="button">Back</a>
    `,
  })
}
