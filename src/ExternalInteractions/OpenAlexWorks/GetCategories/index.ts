import { Effect, pipe } from 'effect'
import { OpenAlex } from '../../../ExternalApis/index.ts'
import type { Doi } from '../../../types/index.ts'
import { CategoriesFromWork } from './CategoriesFromWork.ts'

export const GetCategories = (doi: Doi.Doi) =>
  pipe(
    OpenAlex.getWork(doi),
    Effect.timeout('2 seconds'),
    Effect.andThen(CategoriesFromWork),
    Effect.catchTag('TimeoutException', error => new OpenAlex.WorkIsUnavailable({ cause: error })),
  )
