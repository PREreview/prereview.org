import { Effect } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import * as PublicUrl from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import type { NonEmptyString } from '../../../types/index.ts'

export interface PreprintReviewRequest {
  readonly author: NonEmptyString.NonEmptyString
  readonly preprint: Preprints.Preprint
}

export const PreprintReviewRequestToChatPostMessageInput = Effect.fn(function* (
  reviewRequest: PreprintReviewRequest,
): Effect.fn.Return<Omit<Slack.ChatPostMessageInput, 'channel'>, never, PublicUrl.PublicUrl> {
  return {
    blocks: [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'text',
                text: reviewRequest.author,
                style: { bold: true },
              },
              { type: 'text', text: ' has requested a PREreview: ' },
              {
                type: 'link',
                url: yield* PublicUrl.forRoute(Routes.writeReviewMatch.formatter, { id: reviewRequest.preprint.id }),
              },
            ],
          },
        ],
      },
    ],
    unfurlLinks: true,
    unfurlMedia: false,
  }
})
