import { Match, Struct } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import type * as Prereviewers from '../../../Prereviewers/index.ts'
import type { NonEmptyString } from '../../../types/index.ts'

export interface DatasetReview {
  readonly author: Prereviewers.Persona
  readonly otherAuthors: number
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
            review.otherAuthors > 0
              ? {
                  type: 'text',
                  text: ` and ${review.otherAuthors} other${review.otherAuthors > 1 ? 's' : ''} have published a PREreview: `,
                }
              : { type: 'text', text: ' has published a PREreview: ' },
            { type: 'link', url: review.url },
          ],
        },
      ],
    },
  ],
  unfurlLinks: true,
  unfurlMedia: false,
})

const displayPersona = Match.typeTags<Prereviewers.Persona, NonEmptyString.NonEmptyString>()({
  PublicPersona: Struct.get('name'),
  PseudonymPersona: Struct.get('pseudonym'),
})
