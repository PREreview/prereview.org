import { Array, flow, Option, pipe, Schema, String } from 'effect'

export type FlourishVisualizationId = typeof FlourishVisualizationId.Type

export const FlourishVisualizationId = pipe(
  Schema.String,
  Schema.check(Schema.isPattern(/^\d+$/)),
  Schema.brand('FlourishVisualizationId'),
)

export const fromUrl: (url: URL) => Option.Option<FlourishVisualizationId> = flow(
  url => url.href,
  String.match(
    /^https?:\/\/(?:public\.flourish\.studio|flo\.uri\.sh)\/visualisation\/(\d+)(?:\/(?:embed\/?)?)?(?:[?#].*)?$/,
  ),
  Option.flatMap(Array.get(1)),
  Option.andThen(Schema.decodeOption(FlourishVisualizationId)),
)

export const thumbnailUrl = (visualizationId: FlourishVisualizationId): URL =>
  new URL(`https://public.flourish.studio/visualisation/${visualizationId}/thumbnail`)
