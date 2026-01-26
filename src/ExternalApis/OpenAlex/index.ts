import { HttpClient, HttpClientRequest } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { GetWork } from './GetWork/index.ts'
import { OpenAlexApi } from './OpenAlexApi.ts'

export * from './OpenAlexApi.ts'
export { WorkIsNotFound, WorkIsUnavailable, WorkSchema, type Work } from './Work.ts'

export class OpenAlex extends Context.Tag('OpenAlex')<
  OpenAlex,
  {
    getWork: (
      ...args: Parameters<typeof GetWork>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetWork>>,
      Effect.Effect.Error<ReturnType<typeof GetWork>>
    >
  }
>() {}

export const { getWork } = Effect.serviceFunctions(OpenAlex)

const make: Effect.Effect<typeof OpenAlex.Service, never, HttpClient.HttpClient | OpenAlexApi> = Effect.gen(
  function* () {
    const openAlexApi = yield* OpenAlexApi
    const httpClient = yield* Effect.andThen(
      HttpClient.HttpClient,
      HttpClient.mapRequest(HttpClientRequest.bearerToken(openAlexApi.key)),
    )

    const context = Context.make(HttpClient.HttpClient, httpClient)

    return {
      getWork: flow(GetWork, Effect.provide(context)),
    }
  },
)

export const layer = Layer.effect(OpenAlex, make)
