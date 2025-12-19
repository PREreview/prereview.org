import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { ChatDelete } from './ChatDelete/index.ts'
import { ChatPostMessage } from './ChatPostMessage/index.ts'
import type { SlackApi } from './SlackApi.ts'
import { UsersProfileGet } from './UsersProfileGet/index.ts'

export type { ChatDeleteInput } from './ChatDelete/index.ts'
export type { ChatPostMessageInput } from './ChatPostMessage/index.ts'
export { SlackApi } from './SlackApi.ts'
export { ChannelId, Timestamp, UserId } from './Types.ts'
export type { UsersProfileGetResponse } from './UsersProfileGet/index.ts'

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
    usersProfileGet: (
      ...args: Parameters<typeof UsersProfileGet>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof UsersProfileGet>>,
      Effect.Effect.Error<ReturnType<typeof UsersProfileGet>>
    >
  }
>() {}

export const { chatDelete, chatPostMessage, usersProfileGet } = Effect.serviceFunctions(Slack)

const make: Effect.Effect<typeof Slack.Service, never, HttpClient.HttpClient | SlackApi> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<HttpClient.HttpClient | SlackApi>(), Context.omit(Scope.Scope))

  return {
    chatDelete: flow(ChatDelete, Effect.provide(context)),
    chatPostMessage: flow(ChatPostMessage, Effect.provide(context)),
    usersProfileGet: flow(UsersProfileGet, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Slack, make)
