import { html, plainText } from '../../../html.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'

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
