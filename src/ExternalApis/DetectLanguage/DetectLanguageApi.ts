import { Config, Context, Data, Effect, Layer, type Redacted } from 'effect'

export class DetectLanguageIsUnavailable extends Data.TaggedError('DetectLanguageIsUnavailable')<{ cause?: unknown }> {}

export class DetectLanguageApi extends Context.Tag('DetectLanguageApi')<
  DetectLanguageApi,
  { key: Redacted.Redacted }
>() {}

export const layerApi = (options: typeof DetectLanguageApi.Service) => Layer.succeed(DetectLanguageApi, options)

export const layerApiConfig = (options: Config.Config.Wrap<Parameters<typeof layerApi>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), layerApi))
