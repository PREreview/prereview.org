import * as StatusCodes from '../../StatusCodes.ts'
import { html, plainText } from '../../html.ts'
import { PageResponse } from '../../response.ts'
import * as Routes from '../../routes.ts'

export const UnsupportedDoiPage = () => {
  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText('Sorry, we don’t support this DOI'),
    main: html`
      <h1>Sorry, we don’t support this DOI</h1>

      <p>We support datasets from Dryad.</p>

      <p>
        If this DOI is for a dataset on a repository we don’t support, please
        <a href="mailto:help@prereview.org">get in touch</a>.
      </p>

      <a href="${Routes.ReviewADataset}" class="button">Back</a>
    `,
  })
}
