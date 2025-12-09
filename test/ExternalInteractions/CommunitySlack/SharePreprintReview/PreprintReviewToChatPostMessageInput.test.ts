import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import type { Slack } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalInteractions/CommunitySlack/SharePreprintReview/PreprintReviewToChatPostMessageInput.ts'

test.each([
  [
    'public persona',
    {
      author: 'Josiah Carberry',
      url: new URL('http://example.com/public-persona-review'),
    } satisfies _.PreprintReview,
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
      author: 'Orange Panda',
      url: new URL('http://example.com/pseudonym-persona-review'),
    } satisfies _.PreprintReview,
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
])('PreprintReviewToChatPostMessageInput (%s)', (_name, preprintReview, expectedBlocks) => {
  const actual = _.PreprintReviewToChatPostMessageInput(preprintReview)

  expect(actual).toStrictEqual({ blocks: expectedBlocks, unfurlLinks: true, unfurlMedia: false })
})
