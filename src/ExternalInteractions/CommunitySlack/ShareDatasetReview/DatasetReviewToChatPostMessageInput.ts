import { Match, Struct } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import type * as Personas from '../../../Personas/index.ts'
import type { NonEmptyString } from '../../../types/index.ts'

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

const displayPersona = Match.typeTags<Personas.Persona, NonEmptyString.NonEmptyString>()({
  PublicPersona: Struct.get('name'),
  PseudonymPersona: Struct.get('pseudonym'),
})
