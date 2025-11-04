import { Config, Context, Effect, identity, Layer } from 'effect'

export class ShouldUpdateCommunitySlack extends Context.Tag('ShouldUpdateCommunitySlack')<
  ShouldUpdateCommunitySlack,
  boolean
>() {}

export const shouldUpdateCommunitySlack = Effect.andThen(ShouldUpdateCommunitySlack, identity)

export const layerShouldUpdateCommunitySlack = (
  shouldUpdateCommunitySlack: typeof ShouldUpdateCommunitySlack.Service,
): Layer.Layer<ShouldUpdateCommunitySlack> => Layer.succeed(ShouldUpdateCommunitySlack, shouldUpdateCommunitySlack)

export const layerShouldUpdateCommunitySlackConfig = (
  shouldUpdateCommunitySlack: Config.Config.Wrap<Parameters<typeof layerShouldUpdateCommunitySlack>[0]>,
) => Layer.unwrapEffect(Effect.map(Config.unwrap(shouldUpdateCommunitySlack), layerShouldUpdateCommunitySlack))
