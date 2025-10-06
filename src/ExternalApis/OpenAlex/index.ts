import type * as Doi from 'doi-ts'
import { Context, Effect, pipe } from 'effect'
import { getCategories, getWorkByDoi, type WorkIsNotFound, WorkIsUnavailable } from './Work.ts'

export class GetCategories extends Context.Tag('GetCategories')<
  GetCategories,
  (doi: Doi.Doi) => Effect.Effect<ReadonlyArray<{ id: URL; display_name: string }>, WorkIsNotFound | WorkIsUnavailable>
>() {}

export const getCategoriesFromOpenAlex = (doi: Doi.Doi) =>
  pipe(
    getWorkByDoi(doi),
    Effect.timeout('2 seconds'),
    Effect.andThen(getCategories),
    Effect.catchTag('TimeoutException', error => new WorkIsUnavailable({ cause: error })),
  )
