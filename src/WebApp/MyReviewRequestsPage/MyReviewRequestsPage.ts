import { Array } from 'effect'
import { format } from 'fp-ts-routing'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import { type Html, html, plainText } from '../../html.ts'
import { DefaultLocale } from '../../locales/index.ts'
import type * as Preprints from '../../Preprints/index.ts'
import * as PreprintServers from '../../PreprintServers/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { renderDate } from '../../time.ts'
import type { Temporal } from '../../types/index.ts'
import { getKeywordName, type KeywordId } from '../../types/Keyword.ts'
import { PageResponse } from '../Response/index.ts'

export interface ReviewRequest {
  readonly matchingKeywords: Array.NonEmptyReadonlyArray<KeywordId>
  readonly published: Temporal.PlainDate
  readonly preprint: {
    readonly id: Preprints.PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export const MyReviewRequestsPage = (reviewRequests: ReadonlyArray<ReviewRequest>) => {
  return PageResponse({
    status: StatusCodes.OK,
    title: plainText('My review requests'),
    main: html`
      <h1>My review requests</h1>

        ${Array.match(reviewRequests, {
          onEmpty: () => html`<p>Nothing here yet.</p>`,
          onNonEmpty: reviewRequests =>
            html` <ol class="cards" id="results">
              ${Array.map(
                reviewRequests,
                (request, index) => html`
                  <li>
                    <article aria-labelledby="request-${index}-title">
                      <h2 id="request-${index}-title" class="visually-hidden">
                        Review request for
                        <cite
                          dir="${rtlDetect.getLangDir(request.preprint.language)}"
                          lang="${request.preprint.language}"
                          >${request.preprint.title}</cite
                        >
                        )}
                      </h2>

                      <a href="${format(Routes.writeReviewMatch.formatter, { id: request.preprint.id })}"
                        >A review was requested for
                        <cite
                          dir="${rtlDetect.getLangDir(request.preprint.language)}"
                          lang="${request.preprint.language}"
                          >${request.preprint.title}</cite
                        >
                      </a>

                      <ul class="categories">
                        ${Array.map(
                          request.matchingKeywords,
                          keyword => html`<li><span>${getKeywordName(keyword)}</span></li>`,
                        )}
                      </ul>

                      <dl>
                        <dt>Request published</dt>
                        <dd>${renderDate(DefaultLocale)(request.published)}</dd>
                        <dt>Preprint server</dt>
                        <dd>${PreprintServers.getName(request.preprint.id)}</dd>
                      </dl>
                    </article>
                  </li>
                `,
              )}
            </ol>`,
        })}
      </ol>
    `,
    canonical: Routes.MyReviewRequests,
  })
}
