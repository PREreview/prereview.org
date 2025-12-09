import { HttpClientRequest } from '@effect/platform'
import { pipe } from 'effect'
import { MessageSchema, type Message } from '../Types.ts'

export const CreateRequest = (message: Message) =>
  pipe(HttpClientRequest.post(message.target.inbox), HttpClientRequest.schemaBodyJson(MessageSchema)(message))
