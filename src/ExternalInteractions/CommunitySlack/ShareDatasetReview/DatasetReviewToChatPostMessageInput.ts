import { Struct } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import * as Personas from '../../../Personas/index.ts'

export interface DatasetReview {
  readonly author: Personas.Persona
  readonly url: URL
}

export const DatasetReviewToChatPostMessageInput = (
  review: DatasetReview,
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
              text: displayPersona(review.author),
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

const displayPersona = Personas.match({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})
