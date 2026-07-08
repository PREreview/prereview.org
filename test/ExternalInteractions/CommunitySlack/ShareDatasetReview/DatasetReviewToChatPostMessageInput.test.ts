import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import type { Slack } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalInteractions/CommunitySlack/ShareDatasetReview/DatasetReviewToChatPostMessageInput.ts'
import * as Prereviewers from '../../../../src/Prereviewers/index.ts'
import { Name, OrcidId, Pseudonym } from '../../../../src/types/index.ts'

test.each([
  [
    'public persona',
    {
      author: new Prereviewers.PublicPersona({
        name: Name.Name('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      otherAuthors: 0,
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
      author: new Prereviewers.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') }),
      otherAuthors: 0,
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
  [
    '1 other author',
    {
      author: new Prereviewers.PublicPersona({
        name: Name.Name('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      otherAuthors: 1,
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
              { type: 'text', text: ' and 1 other have published a PREreview: ' },
              { type: 'link', url: new URL('http://example.com/public-persona-review') },
            ],
          },
        ],
      },
    ] satisfies Slack.ChatPostMessageInput['blocks'],
  ],
  [
    '2 other authors',
    {
      author: new Prereviewers.PublicPersona({
        name: Name.Name('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      otherAuthors: 2,
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
              { type: 'text', text: ' and 2 others have published a PREreview: ' },
              { type: 'link', url: new URL('http://example.com/public-persona-review') },
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
