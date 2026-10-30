import { HttpClient, HttpClientRequest } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { Detect } from './Detect/index.ts'
import { DetectLanguageApi } from './DetectLanguageApi.ts'

export { LanguageCandidates } from './Detect/index.ts'
export * from './DetectLanguageApi.ts'

export class DetectLanguage extends Context.Tag('DetectLanguage')<
  DetectLanguage,
  {
    detect: (
      ...args: Parameters<typeof Detect>
    ) => Effect.Effect<Effect.Effect.Success<ReturnType<typeof Detect>>, Effect.Effect.Error<ReturnType<typeof Detect>>>
  }
>() {}

export const detect = (...args: Parameters<(typeof DetectLanguage.Service)['detect']>) =>
  Effect.flatMap(DetectLanguage, service => service.detect(...args))

const make: Effect.Effect<typeof DetectLanguage.Service, never, HttpClient.HttpClient | DetectLanguageApi> = Effect.gen(
  function* () {
    const detectLanguageApi = yield* DetectLanguageApi
    const httpClient = yield* Effect.map(
      HttpClient.HttpClient,
      HttpClient.mapRequest(flow(HttpClientRequest.acceptJson, HttpClientRequest.bearerToken(detectLanguageApi.key))),
    )

    const context = Context.make(HttpClient.HttpClient, httpClient)

    return {
      detect: flow(Detect, Effect.provide(context)),
    }
  },
)

export const layer = Layer.effect(DetectLanguage, make)
