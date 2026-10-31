import { Config, Context, Effect, Layer, type Redacted } from 'effect'
import type { ContentfulId } from './Types.ts'

export class ContentfulConfig extends Context.Service<
  ContentfulConfig,
  {
    accessToken: Redacted.Redacted
    previewAccessToken: Redacted.Redacted
    environmentId: ContentfulId
    spaceId: ContentfulId
  }
>()('ContentfulConfig') {
  static readonly layer = (options: typeof ContentfulConfig.Service) => Layer.succeed(this, options)

  static readonly layerConfig = (options: Config.Wrap<Parameters<typeof this.layer>[0]>) =>
    Layer.unwrap(Effect.map(Config.unwrap(options), this.layer))
}

export const UsePreviewApi = Context.Reference<boolean>('UsePreviewApi', {
  defaultValue: () => false,
})
