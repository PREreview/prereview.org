import { Config, Context, Effect, Layer, type Redacted } from 'effect'

export class SlackOauth extends Context.Service<
  SlackOauth,
  {
    readonly authorizeUrl: URL
    readonly clientId: string
    readonly clientSecret: Redacted.Redacted
    readonly tokenUrl: URL
  }
>()('SlackOauth') {}

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

export const layerConfig = (options: Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), layer))
