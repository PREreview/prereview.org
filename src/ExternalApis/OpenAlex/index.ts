import { HttpClient, HttpClientRequest } from 'effect/http'
import { Context, Effect, flow, Layer } from 'effect'
import { GetWork } from './GetWork/index.ts'
import { OpenAlexApi } from './OpenAlexApi.ts'

export * from './OpenAlexApi.ts'
export { WorkIsNotFound, WorkIsUnavailable, WorkSchema, type Work } from './Work.ts'

export class OpenAlex extends Context.Service<
  OpenAlex,
  {
    getWork: (
      ...args: Parameters<typeof GetWork>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetWork>>, Effect.Error<ReturnType<typeof GetWork>>>
  }
>()('OpenAlex') {}

export const getWork = (...args: Parameters<(typeof OpenAlex.Service)['getWork']>) =>
  OpenAlex.use(service => service.getWork(...args))

const make: Effect.Effect<typeof OpenAlex.Service, never, HttpClient.HttpClient | OpenAlexApi> = Effect.gen(
  function* () {
    const openAlexApi = yield* OpenAlexApi
    const httpClient = yield* HttpClient.HttpClient.useSync(
      HttpClient.mapRequest(HttpClientRequest.bearerToken(openAlexApi.key)),
    )

    const context = Context.make(HttpClient.HttpClient, httpClient)

    return {
      getWork: flow(GetWork, Effect.provide(context)),
    }
  },
)

export const layer = Layer.effect(OpenAlex, make)
