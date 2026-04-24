import { Context, Effect, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import { ImportRapidPrereview } from './ImportRapidPrereview.ts'

export * from './Errors.ts'
export { ImportRapidPrereviewInput } from './ImportRapidPrereview.ts'
export * from './Reactions/index.ts'

export class PreprintReviews extends Context.Tag('PreprintReviews')<
  PreprintReviews,
  {
    importRapidPrereview: Commands.FromCommand<typeof ImportRapidPrereview>
  }
>() {}

export const layer = Layer.effect(
  PreprintReviews,
  Effect.all({
    importRapidPrereview: Commands.makeCommand(ImportRapidPrereview),
  }),
)
