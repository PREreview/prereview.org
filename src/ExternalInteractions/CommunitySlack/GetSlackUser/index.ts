import { Data, Effect, pipe } from 'effect'
import { Slack } from '../../../ExternalApis/index.ts'
import { UsersProfileGetResponseToSlackUser } from './UsersProfileGetResponseToSlackUser.ts'

export class FailedToGetSlackUser extends Data.TaggedError('FailedToGetSlackUser')<{
  cause?: unknown
}> {}

export const GetSlackUser = (userId: Slack.UserId) =>
  pipe(
    Slack.usersProfileGet(userId),
    Effect.andThen(response => UsersProfileGetResponseToSlackUser(response, userId)),
    Effect.catchAll(error => new FailedToGetSlackUser({ cause: error })),
  )
