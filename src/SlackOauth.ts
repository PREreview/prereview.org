import { Config, Context, Effect, Layer, type Redacted } from 'effect'

export class SlackOauth extends Context.Tag('SlackOauth')<
  SlackOauth,
  {
    readonly authorizeUrl: URL
    readonly clientId: string
    readonly clientSecret: Redacted.Redacted
    readonly tokenUrl: URL
  }
>() {}

export const layer = ({
  clientId,
  clientSecret,
}: {
  clientId: string
  clientSecret: Redacted.Redacted
}): Layer.Layer<SlackOauth> =>
  Layer.succeed(SlackOauth, {
    authorizeUrl: new URL('https://slack.com/oauth/v2/authorize'),
    clientId,
    clientSecret,
    tokenUrl: new URL('https://slack.com/api/oauth.v2.access'),
  })

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
