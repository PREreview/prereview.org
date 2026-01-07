import { Array } from 'effect'
import { html, plainText } from '../../html.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { getKeywordName, type KeywordId } from '../../types/Keyword.ts'
import { PageResponse } from '../Response/index.ts'

export const SubscribeToKeywordsPage = (keywords?: ReadonlyArray<KeywordId>) => {
  return PageResponse({
    status: StatusCodes.OK,
    title: plainText('Subscribe to keywords'),
    main: html`
      <form method="post" action="${Routes.SubscribeToKeywords}" novalidate>
        ${typeof keywords === 'undefined'
          ? html`
              <div>
                <h1>
                  <label id="search-label" for="search">Subscribe to keywords</label>
                </h1>

                <input name="search" id="search" type="text" size="60" spellcheck="false" />
              </div>

              <button>Search</button>
            `
          : html`
              <h1>Subscribe to keywords</h1>

              ${Array.match(keywords, {
                onNonEmpty: keywords => html`
                  ${Array.map(
                    keywords,
                    keywordId => html`
                      <label>
                        <input name="keywords" type="checkbox" value="${keywordId}" />
                        <span>${getKeywordName(keywordId)}</span>
                      </label>
                    `,
                  )}

                  <button>Subscribe</button>
                `,
                onEmpty: () => html` <p>No results found.</p>`,
              })}
            `}
      </form>
    `,
    canonical: Routes.SubscribeToKeywords,
    skipToLabel: 'form',
  })
}
