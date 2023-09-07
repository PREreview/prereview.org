import * as TE from 'fp-ts/TaskEither'
import { match } from 'ts-pattern'

export const getUserFromSlack = (slackId: string) =>
  match(slackId)
    .with('U05BUCDTN2X', () =>
      TE.right({
        name: 'Daniela Saderi (she/her)',
        image: new URL('https://avatars.slack-edge.com/2023-06-27/5493277920274_7b5878dc4f15503ae153_48.jpg'),
      }),
    )
    .otherwise(() => TE.left('not-found' as const))
