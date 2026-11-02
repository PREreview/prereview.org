import { HttpClient, HttpClientRequest } from 'effect/http'
import { Context, Effect, flow, Layer } from 'effect'
import { Detect } from './Detect/index.ts'
import { DetectLanguageApi } from './DetectLanguageApi.ts'

export { LanguageCandidates } from './Detect/index.ts'
export * from './DetectLanguageApi.ts'

export class DetectLanguage extends Context.Service<
  DetectLanguage,
  {
    detect: (
      ...args: Parameters<typeof Detect>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof Detect>>, Effect.Error<ReturnType<typeof Detect>>>
  }
>()('DetectLanguage') {}

export const detect = (...args: Parameters<(typeof DetectLanguage.Service)['detect']>) =>
  DetectLanguage.use(service => service.detect(...args))

const make: Effect.Effect<typeof DetectLanguage.Service, never, HttpClient.HttpClient | DetectLanguageApi> = Effect.gen(
  function* () {
    const detectLanguageApi = yield* DetectLanguageApi
    const httpClient = yield* HttpClient.HttpClient.useSync(
      HttpClient.mapRequest(flow(HttpClientRequest.acceptJson, HttpClientRequest.bearerToken(detectLanguageApi.key))),
    )

    const context = Context.make(HttpClient.HttpClient, httpClient)

    return {
      detect: flow(Detect, Effect.provide(context)),
    }
  },
)

export const layer = Layer.effect(DetectLanguage, make)
