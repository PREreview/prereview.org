import { Context, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import type { ImportRapidPrereview } from './ImportRapidPrereview.ts'

export * from './Errors.ts'
export { ImportRapidPrereviewInput } from './ImportRapidPrereview.ts'
export * from './Reactions/index.ts'

export class PreprintReviews extends Context.Tag('PreprintReviews')<
  PreprintReviews,
  {
    importRapidPrereview: Commands.FromCommand<typeof ImportRapidPrereview>
  }
>() {}

export const layer = Layer.succeed(PreprintReviews, {
  importRapidPrereview: () => new Commands.UnableToHandleCommand({ cause: 'Not implemented' }),
})
