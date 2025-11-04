import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import * as _ from '../../../src/DatasetReviews/Reactions/DatasetReviewToChatPostMessageInput.ts'
import { Slack } from '../../../src/ExternalApis/index.ts'
import { CommunitySlack } from '../../../src/ExternalInteractions/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import { NonEmptyString, OrcidId, Pseudonym } from '../../../src/types/index.ts'
import * as EffectTest from '../../EffectTest.ts'

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
    Slack.ChannelId.make('channel1'),
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
    Slack.ChannelId.make('channel2'),
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
])('DatasetReviewToChatPostMessageInput (%s)', (_name, datasetReview, channelId, expectedBlocks) =>
  Effect.gen(function* () {
    const actual = yield* _.DatasetReviewToChatPostMessageInput(datasetReview)

    expect(actual).toStrictEqual({ channel: channelId, blocks: expectedBlocks, unfurlLinks: true, unfurlMedia: false })
  }).pipe(Effect.provide(Layer.mergeAll(CommunitySlack.layerChannelIds({ shareAReview: channelId }))), EffectTest.run),
)
