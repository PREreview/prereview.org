import type { HttpClient } from 'effect/http'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { ChatDelete } from './ChatDelete/index.ts'
import { ChatPostMessage } from './ChatPostMessage/index.ts'
import type { SlackApi } from './SlackApi.ts'
import { UsersProfileGet } from './UsersProfileGet/index.ts'
import { UsersProfileSet } from './UsersProfileSet/index.ts'

export type { ChatDeleteInput } from './ChatDelete/index.ts'
export type { ChatPostMessageInput } from './ChatPostMessage/index.ts'
export { SlackApi } from './SlackApi.ts'
export { ChannelId, Timestamp, UserId } from './Types.ts'
export type { UsersProfileGetResponse } from './UsersProfileGet/index.ts'
export type { UsersProfileSetInput } from './UsersProfileSet/index.ts'

export class Slack extends Context.Service<
  Slack,
  {
    chatDelete: (
      ...args: Parameters<typeof ChatDelete>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof ChatDelete>>, Effect.Error<ReturnType<typeof ChatDelete>>>
    chatPostMessage: (
      ...args: Parameters<typeof ChatPostMessage>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof ChatPostMessage>>,
      Effect.Error<ReturnType<typeof ChatPostMessage>>
    >
    usersProfileGet: (
      ...args: Parameters<typeof UsersProfileGet>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof UsersProfileGet>>,
      Effect.Error<ReturnType<typeof UsersProfileGet>>
    >
    usersProfileSet: (
      ...args: Parameters<typeof UsersProfileSet>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof UsersProfileSet>>,
      Effect.Error<ReturnType<typeof UsersProfileSet>>
    >
  }
>()('Slack') {}

export const chatDelete = (...args: Parameters<(typeof Slack.Service)['chatDelete']>) =>
  Slack.use(service => service.chatDelete(...args))

export const chatPostMessage = (...args: Parameters<(typeof Slack.Service)['chatPostMessage']>) =>
  Slack.use(service => service.chatPostMessage(...args))

export const usersProfileGet = (...args: Parameters<(typeof Slack.Service)['usersProfileGet']>) =>
  Slack.use(service => service.usersProfileGet(...args))

export const usersProfileSet = (...args: Parameters<(typeof Slack.Service)['usersProfileSet']>) =>
  Slack.use(service => service.usersProfileSet(...args))

const make: Effect.Effect<typeof Slack.Service, never, HttpClient.HttpClient | SlackApi> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient | SlackApi>(), Context.omit(Scope.Scope))

  return {
    chatDelete: flow(ChatDelete, Effect.provide(context)),
    chatPostMessage: flow(ChatPostMessage, Effect.provide(context)),
    usersProfileGet: flow(UsersProfileGet, Effect.provide(context)),
    usersProfileSet: flow(UsersProfileSet, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Slack, make)
