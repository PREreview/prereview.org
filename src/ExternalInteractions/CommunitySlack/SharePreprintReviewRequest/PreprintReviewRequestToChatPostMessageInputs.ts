import { Array, Effect, Option, pipe, Struct } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import { plainText } from '../../../html.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import * as PreprintServers from '../../../PreprintServers/index.ts'
import * as PublicUrl from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { renderDateString } from '../../../time.ts'
import type { NonEmptyString } from '../../../types/index.ts'

export interface PreprintReviewRequest {
  readonly author: NonEmptyString.NonEmptyString
  readonly preprint: Preprints.Preprint
}

export const PreprintReviewRequestToChatPostMessageInputs = Effect.fn(function* ({
  author,
  preprint,
}: PreprintReviewRequest): Effect.fn.Return<
  Array.NonEmptyReadonlyArray<Omit<Slack.ChatPostMessageInput, 'channel'>>,
  never,
  PublicUrl.PublicUrl
> {
  return [
    {
      blocks: [{ type: 'markdown', text: `${author} is looking for reviews of a preprint.` }],
      unfurlLinks: true,
      unfurlMedia: false,
    },
    {
      blocks: [
        {
          type: 'markdown',
          text: `The preprint is:\n\n**[${plainText(preprint.title.text).toString()}](${preprint.url.href})**\nby ${pipe(preprint.authors, Array.map(Struct.get('name')), formatList)}\n\n**Posted**\n${renderDateString('en')(preprint.posted)}\n\n**Server**\n${PreprintServers.getName(preprint.id)}`,
        },
      ],
      unfurlLinks: true,
      unfurlMedia: false,
    },
    ...Option.match(Option.fromNullable(preprint.abstract), {
      onNone: Array.empty,
      onSome: abstract =>
        [
          {
            blocks: [
              { type: 'markdown', text: 'Have a look at the abstract:' },
              {
                type: 'rich_text',
                elements: [
                  {
                    type: 'rich_text_quote',
                    elements: [
                      {
                        type: 'text',
                        text: plainText(abstract.text).value.replaceAll(/\s+/gm, ' ').trim(),
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
        { type: 'markdown', text: `Please do help ${author} with a PREreview, or pass this on to someone who could.` },
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

function formatList(list: ReadonlyArray<string>) {
  const formatter = new Intl.ListFormat('en')

  return formatter.format(list)
}
