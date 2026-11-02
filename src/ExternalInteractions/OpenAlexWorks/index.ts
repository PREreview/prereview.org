import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { OpenAlex } from '../../ExternalApis/index.ts'
import { GetCategories } from './GetCategories/index.ts'
import { GetCategoriesForAReviewRequest } from './GetCategoriesForAReviewRequest/index.ts'

export { CategoriesAreNotAvailable, type CategoriesForAReviewRequest } from './GetCategoriesForAReviewRequest/index.ts'

export class OpenAlexWorks extends Context.Service<
  OpenAlexWorks,
  {
    getCategories: (
      ...args: Parameters<typeof GetCategories>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetCategories>>, Effect.Error<ReturnType<typeof GetCategories>>>
    getCategoriesForAReviewRequest: (
      ...args: Parameters<typeof GetCategoriesForAReviewRequest>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof GetCategoriesForAReviewRequest>>,
      Effect.Error<ReturnType<typeof GetCategoriesForAReviewRequest>>
    >
  }
>()('OpenAlexWorks') {}

export const getCategories = (...args: Parameters<(typeof OpenAlexWorks.Service)['getCategories']>) =>
  OpenAlexWorks.use(service => service.getCategories(...args))

export const getCategoriesForAReviewRequest = (
  ...args: Parameters<(typeof OpenAlexWorks.Service)['getCategoriesForAReviewRequest']>
) => OpenAlexWorks.use(service => service.getCategoriesForAReviewRequest(...args))

const make: Effect.Effect<typeof OpenAlexWorks.Service, never, OpenAlex.OpenAlex> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<OpenAlex.OpenAlex>(), Context.omit(Scope.Scope))

  return {
    getCategories: flow(GetCategories, Effect.provide(context)),
    getCategoriesForAReviewRequest: flow(GetCategoriesForAReviewRequest, Effect.provide(context)),
  }
})

export const layer = Layer.effect(OpenAlexWorks, make)
