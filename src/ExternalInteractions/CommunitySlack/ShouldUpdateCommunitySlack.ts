import { Config, Context, Effect, identity, Layer } from 'effect'

export class ShouldUpdateCommunitySlack extends Context.Service<ShouldUpdateCommunitySlack, boolean>()(
  'ShouldUpdateCommunitySlack',
) {}

export const shouldUpdateCommunitySlack = Effect.map(ShouldUpdateCommunitySlack, identity)

export const layerShouldUpdateCommunitySlack = (
  shouldUpdateCommunitySlack: typeof ShouldUpdateCommunitySlack.Service,
): Layer.Layer<ShouldUpdateCommunitySlack> => Layer.succeed(ShouldUpdateCommunitySlack, shouldUpdateCommunitySlack)

export const layerShouldUpdateCommunitySlackConfig = (
  shouldUpdateCommunitySlack: Config.Wrap<Parameters<typeof layerShouldUpdateCommunitySlack>[0]>,
) => Layer.unwrap(Effect.map(Config.unwrap(shouldUpdateCommunitySlack), layerShouldUpdateCommunitySlack))
