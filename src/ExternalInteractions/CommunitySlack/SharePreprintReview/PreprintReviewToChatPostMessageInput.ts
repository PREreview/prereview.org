import type { Slack } from '../../../ExternalApis/index.ts'

export interface PreprintReview {
  readonly author: string
  readonly url: URL
}

export const PreprintReviewToChatPostMessageInput = (
  review: PreprintReview,
): Omit<Slack.ChatPostMessageInput, 'channel'> => ({
  blocks: [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'text',
              text: review.author,
              style: {
                bold: true,
              },
            },
            { type: 'text', text: ' has published a PREreview: ' },
            { type: 'link', url: review.url },
          ],
        },
      ],
    },
  ],
  unfurlLinks: true,
  unfurlMedia: false,
})
