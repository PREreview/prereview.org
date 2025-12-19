import type { Slack } from '../../../ExternalApis/index.ts'
import type { SlackUser } from '../../../slack-user.ts'

export const UsersProfileGetResponseToSlackUser = (
  response: Slack.UsersProfileGetResponse,
  userId: Slack.UserId,
): SlackUser => ({
  name: response.realName,
  image: response.image48,
  profile: new URL(`https://prereviewcommunity.slack.com/team/${userId}`),
})
