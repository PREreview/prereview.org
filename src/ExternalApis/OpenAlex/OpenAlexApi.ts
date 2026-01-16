import { Config, Context, Effect, Layer, type Redacted } from 'effect'

export class OpenAlexApi extends Context.Tag('OpenAlexApi')<OpenAlexApi, { key: Redacted.Redacted }>() {}

export const layerApi = (options: typeof OpenAlexApi.Service) => Layer.succeed(OpenAlexApi, options)

export const layerApiConfig = (options: Config.Config.Wrap<Parameters<typeof layerApi>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), layerApi))
