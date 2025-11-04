import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import type { Slack } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalInteractions/CommunitySlack/ShareDatasetReview/DatasetReviewToChatPostMessageInput.ts'
import * as Personas from '../../../../src/Personas/index.ts'
import { NonEmptyString, OrcidId, Pseudonym } from '../../../../src/types/index.ts'

test.each([
  [
    'public persona',
    {
      author: new Personas.PublicPersona({
        name: NonEmptyString.NonEmptyString('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      url: new URL('http://example.com/public-persona-review'),
    } satisfies _.DatasetReview,
    [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Josiah Carberry', style: { bold: true } },
              { type: 'text', text: ' has published a PREreview: ' },
              { type: 'link', url: new URL('http://example.com/public-persona-review') },
            ],
          },
        ],
      },
    ] satisfies Slack.ChatPostMessageInput['blocks'],
  ],
  [
    'pseudonym persona',
    {
      author: new Personas.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') }),
      url: new URL('http://example.com/pseudonym-persona-review'),
    } satisfies _.DatasetReview,
    [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Orange Panda', style: { bold: true } },
              { type: 'text', text: ' has published a PREreview: ' },
              { type: 'link', url: new URL('http://example.com/pseudonym-persona-review') },
            ],
          },
        ],
      },
    ] satisfies Slack.ChatPostMessageInput['blocks'],
  ],
])('DatasetReviewToChatPostMessageInput (%s)', (_name, datasetReview, expectedBlocks) => {
  const actual = _.DatasetReviewToChatPostMessageInput(datasetReview)

  expect(actual).toStrictEqual({ blocks: expectedBlocks, unfurlLinks: true, unfurlMedia: false })
})
