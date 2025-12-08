import { Array, Effect, Option } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import { plainText } from '../../../html.ts'
import * as PublicUrl from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import type { PreprintReviewRequest, Thread } from './GenerateThread.ts'

export type PreprintReviewRequestWithThread = PreprintReviewRequest & { thread: Thread }

export const PreprintReviewRequestToChatPostMessageInputs = Effect.fn(function* ({
  preprint,
  thread,
}: PreprintReviewRequestWithThread): Effect.fn.Return<
  Array.NonEmptyReadonlyArray<Omit<Slack.ChatPostMessageInput, 'channel'>>,
  never,
  PublicUrl.PublicUrl
> {
  return [
    {
      blocks: [{ type: 'markdown', text: thread.main }],
      unfurlLinks: true,
      unfurlMedia: false,
    },
    {
      blocks: [{ type: 'markdown', text: thread.detail }],
      unfurlLinks: true,
      unfurlMedia: false,
    },
    ...Option.match(thread.abstract, {
      onNone: Array.empty,
      onSome: abstract =>
        [
          {
            blocks: [
              { type: 'markdown', text: abstract },
              {
                type: 'rich_text',
                elements: [
                  {
                    type: 'rich_text_quote',
                    elements: [
                      {
                        type: 'text',
                        text: Option.match(Option.fromNullable(preprint.abstract), {
                          onSome: abstract => plainText(abstract.text).value.replaceAll(/\s+/gm, ' ').trim(),
                          onNone: () => 'The abstract is unavailable.',
                        }),
                      },
                    ],
                  },
                ],
              },
            ],
            unfurlLinks: true,
            unfurlMedia: false,
          },
        ] satisfies Array.NonEmptyReadonlyArray<Omit<Slack.ChatPostMessageInput, 'channel'>>,
    }),
    {
      blocks: [
        { type: 'markdown', text: thread.callToAction },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Write a PREreview' },
              style: 'primary',
              url: yield* PublicUrl.forRoute(Routes.writeReviewMatch.formatter, { id: preprint.id }),
            },
          ],
        },
      ],
      unfurlLinks: true,
      unfurlMedia: false,
    },
  ]
})
