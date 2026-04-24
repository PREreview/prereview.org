import { Context, Effect, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import * as Queries from '../Queries.ts'
import type { GetRapidPrereviewsForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
import { ImportRapidPrereview } from './ImportRapidPrereview.ts'

export * from './Errors.ts'
export type { RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
export { ImportRapidPrereviewInput } from './ImportRapidPrereview.ts'
export * from './Reactions/index.ts'

export class PreprintReviews extends Context.Tag('PreprintReviews')<
  PreprintReviews,
  {
    getRapidPrereviewsForAPreprint: Queries.FromOnDemandQuery<typeof GetRapidPrereviewsForAPreprint>
    importRapidPrereview: Commands.FromCommand<typeof ImportRapidPrereview>
  }
>() {}

export const layer = Layer.effect(
  PreprintReviews,
  Effect.gen(function* () {
    return {
      getRapidPrereviewsForAPreprint: () => new Queries.UnableToQuery({ cause: 'not implemented' }),
      importRapidPrereview: yield* Commands.makeCommand(ImportRapidPrereview),
    }
  }),
)
