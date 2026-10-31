import { Config, Context, Data, Effect, Layer, type Redacted } from 'effect'

export class DetectLanguageIsUnavailable extends Data.TaggedError('DetectLanguageIsUnavailable')<{ cause?: unknown }> {}

export class DetectLanguageApi extends Context.Service<DetectLanguageApi, { key: Redacted.Redacted }>()(
  'DetectLanguageApi',
) {}

export const layerApi = (options: typeof DetectLanguageApi.Service) => Layer.succeed(DetectLanguageApi, options)

export const layerApiConfig = (options: Config.Wrap<Parameters<typeof layerApi>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), layerApi))
