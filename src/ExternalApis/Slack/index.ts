import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { ChatPostMessage } from './ChatPostMessage/index.ts'
import type { SlackApi } from './SlackApi.ts'

export type { ChatPostMessageInput } from './ChatPostMessage/index.ts'
export { SlackApi } from './SlackApi.ts'
export { ChannelId, Timestamp, UserId } from './Types.ts'

export class Slack extends Context.Tag('Slack')<
  Slack,
  {
    chatPostMessage: (
      ...args: Parameters<typeof ChatPostMessage>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof ChatPostMessage>>,
      Effect.Effect.Error<ReturnType<typeof ChatPostMessage>>
    >
  }
>() {}

export const { chatPostMessage } = Effect.serviceFunctions(Slack)

const make: Effect.Effect<typeof Slack.Service, never, HttpClient.HttpClient | SlackApi> = Effect.gen(function* () {
  const context = yield* Effect.context<HttpClient.HttpClient | SlackApi>()

  return {
    chatPostMessage: flow(ChatPostMessage, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Slack, make)
