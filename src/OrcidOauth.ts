import { Config, Context, Effect, Layer, type Redacted } from 'effect'

export class OrcidOauth extends Context.Tag('OrcidOauth')<
  OrcidOauth,
  {
    readonly authorizeUrl: URL
    readonly clientId: string
    readonly clientSecret: Redacted.Redacted
    readonly revokeUrl: URL
    readonly tokenUrl: URL
  }
>() {}

export const layer = ({
  clientId,
  clientSecret,
  url,
}: {
  clientId: string
  clientSecret: Redacted.Redacted
  url: URL
}): Layer.Layer<OrcidOauth> =>
  Layer.succeed(OrcidOauth, {
    authorizeUrl: new URL(`${url.origin}/oauth/authorize`),
    clientId,
    clientSecret,
    revokeUrl: new URL(`${url.origin}/oauth/revoke`),
    tokenUrl: new URL(`${url.origin}/oauth/token`),
  })

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
