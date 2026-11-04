import { Data, Effect, Redacted } from 'effect'
import { Slack } from '../../../ExternalApis/index.ts'
import type { SlackUserId } from '../../../slack-user-id.ts'
import { shouldUpdateCommunitySlack } from '../ShouldUpdateCommunitySlack.ts'

export class FailedToRemoveOrcidFromSlackProfile extends Data.TaggedError('FailedToRemoveOrcidFromSlackProfile')<{
  cause?: unknown
}> {}

export const RemoveOrcidFromSlackProfile = Effect.fnUntraced(
  function* (user: SlackUserId) {
    if (!(yield* shouldUpdateCommunitySlack)) {
      return
    }

    yield* Slack.usersProfileSet(
      { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
      Redacted.make(user.accessToken),
    )

    yield* Slack.chatPostMessage({
      channel: user.userId,
      blocks: [
        {
          type: 'markdown',
          text: 'As you’ve disconnected your PREreview profile from your Community Slack account, I’ve removed your ORCID iD from your Slack profile.',
        },
      ],
    })
  },
  Effect.catch(error => new FailedToRemoveOrcidFromSlackProfile({ cause: error })),
)
