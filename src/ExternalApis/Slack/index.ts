import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { ChatDelete } from './ChatDelete/index.ts'
import { ChatPostMessage } from './ChatPostMessage/index.ts'
import type { SlackApi } from './SlackApi.ts'

export type { ChatDeleteInput } from './ChatDelete/index.ts'
export type { ChatPostMessageInput } from './ChatPostMessage/index.ts'
export { SlackApi } from './SlackApi.ts'
export { ChannelId, Timestamp, UserId } from './Types.ts'

export class Slack extends Context.Tag('Slack')<
  Slack,
  {
    chatDelete: (
      ...args: Parameters<typeof ChatDelete>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof ChatDelete>>,
      Effect.Effect.Error<ReturnType<typeof ChatDelete>>
    >
    chatPostMessage: (
      ...args: Parameters<typeof ChatPostMessage>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof ChatPostMessage>>,
      Effect.Effect.Error<ReturnType<typeof ChatPostMessage>>
    >
  }
>() {}

export const { chatDelete, chatPostMessage } = Effect.serviceFunctions(Slack)

const make: Effect.Effect<typeof Slack.Service, never, HttpClient.HttpClient | SlackApi> = Effect.gen(function* () {
  const context = yield* Effect.context<HttpClient.HttpClient | SlackApi>()

  return {
    chatDelete: flow(ChatDelete, Effect.provide(context)),
    chatPostMessage: flow(ChatPostMessage, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Slack, make)
