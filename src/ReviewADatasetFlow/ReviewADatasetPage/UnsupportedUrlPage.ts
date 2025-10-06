import { html, plainText } from '../../html.ts'
import { PageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'

export const UnsupportedUrlPage = () => {
  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText('Sorry, we don’t support this URL'),
    main: html`
      <h1>Sorry, we don’t support this URL</h1>

      <p>We support datasets from Dryad.</p>

      <p>
        If this URL is for a dataset on a repository we don’t support, please
        <a href="mailto:help@prereview.org">get in touch</a>.
      </p>

      <p>Otherwise, if the dataset has a DOI, please try using that instead.</p>

      <a href="${Routes.ReviewADataset}" class="button">Back</a>
    `,
  })
}
