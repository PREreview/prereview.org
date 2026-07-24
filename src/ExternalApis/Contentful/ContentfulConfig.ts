import { Config, Context, Effect, Layer, type Redacted } from 'effect'
import type { ContentfulId } from './Types.ts'

export class ContentfulConfig extends Context.Tag('ContentfulConfig')<
  ContentfulConfig,
  { accessToken: Redacted.Redacted; environmentId: ContentfulId; spaceId: ContentfulId }
>() {
  static readonly layer = (options: typeof ContentfulConfig.Service) => Layer.succeed(this, options)

  static readonly layerConfig = (options: Config.Config.Wrap<Parameters<typeof this.layer>[0]>) =>
    Layer.unwrapEffect(Effect.map(Config.unwrap(options), this.layer))
}
