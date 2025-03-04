import type * as Doi from 'doi-ts'
import { Effect, pipe } from 'effect'
import { getCategories, getWorkByDoi, WorkIsUnavailable } from './work.js'

export const getCategoriesFromOpenAlex = (doi: Doi.Doi) =>
  pipe(
    getWorkByDoi(doi),
    Effect.timeout('2 seconds'),
    Effect.andThen(getCategories),
    Effect.catchTag('TimeoutException', error => new WorkIsUnavailable({ cause: error })),
  )
