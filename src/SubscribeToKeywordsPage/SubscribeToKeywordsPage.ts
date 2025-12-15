import { html, plainText } from '../html.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import * as StatusCodes from '../StatusCodes.ts'

export const SubscribeToKeywordsPage = () => {
  return PageResponse({
    status: StatusCodes.OK,
    title: plainText('Subscribe to keywords'),
    main: html`
      <form method="post" action="${Routes.SubscribeToKeywords}" novalidate>
        <div>
          <h1>
            <label id="search-label" for="search">Subscribe to keywords</label>
          </h1>

          <input name="search" id="search" type="text" size="60" spellcheck="false" />
        </div>

        <button>Search</button>
      </form>
    `,
    canonical: Routes.SubscribeToKeywords,
    skipToLabel: 'form',
  })
}
