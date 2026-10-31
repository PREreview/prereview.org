import { Config, Context, Effect, Layer, type Redacted } from 'effect'

export class OpenAlexApi extends Context.Service<OpenAlexApi, { key: Redacted.Redacted }>()('OpenAlexApi') {}

export const layerApi = (options: typeof OpenAlexApi.Service) => Layer.succeed(OpenAlexApi, options)

export const layerApiConfig = (options: Config.Wrap<Parameters<typeof layerApi>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), layerApi))
