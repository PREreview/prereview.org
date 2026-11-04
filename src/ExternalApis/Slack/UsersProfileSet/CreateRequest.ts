import { HttpClientRequest } from 'effect/http'
import { pipe, type Redacted } from 'effect'
import { UsersProfileSetInput } from './UsersProfileSetInput.ts'

export const CreateRequest = (input: UsersProfileSetInput, userToken: Redacted.Redacted) =>
  pipe(
    HttpClientRequest.post('https://slack.com/api/users.profile.set'),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(userToken),
    HttpClientRequest.schemaBodyJson(UsersProfileSetInput)(input),
  )
