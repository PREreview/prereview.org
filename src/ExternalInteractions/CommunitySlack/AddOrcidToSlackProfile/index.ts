import { Data, Effect } from 'effect'
import { Slack } from '../../../ExternalApis/index.ts'
import type { SlackUserId } from '../../../slack-user-id.ts'
import { type OrcidId, toUrl } from '../../../types/OrcidId.ts'
import { shouldUpdateCommunitySlack } from '../ShouldUpdateCommunitySlack.ts'

export class FailedToAddOrcidToSlackProfile extends Data.TaggedError('FailedToAddOrcidToSlackProfile')<{
  cause?: unknown
}> {}

export const AddOrcidToSlackProfile = Effect.fnUntraced(
  function* (user: SlackUserId, orcid: OrcidId) {
    if (!(yield* shouldUpdateCommunitySlack)) {
      return
    }

    yield* Slack.usersProfileSet(
      { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
      user.accessToken,
    )

    yield* Slack.chatPostMessage({
      channel: user.userId,
      blocks: [
        {
          type: 'markdown',
          text: 'Thanks for connecting your PREreview profile to your Community Slack Account. I’ve added your ORCID iD to your Slack profile.',
        },
      ],
    })
  },
  Effect.catch(error => new FailedToAddOrcidToSlackProfile({ cause: error })),
)
