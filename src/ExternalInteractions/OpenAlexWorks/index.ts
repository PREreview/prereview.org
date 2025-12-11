import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { OpenAlex } from '../../ExternalApis/index.ts'
import { GetCategories } from './GetCategories/index.ts'
import { GetCategoriesForAReviewRequest } from './GetCategoriesForAReviewRequest/index.ts'

export { CategoriesAreNotAvailable, type CategoriesForAReviewRequest } from './GetCategoriesForAReviewRequest/index.ts'

export class OpenAlexWorks extends Context.Tag('OpenAlexWorks')<
  OpenAlexWorks,
  {
    getCategories: (
      ...args: Parameters<typeof GetCategories>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetCategories>>,
      Effect.Effect.Error<ReturnType<typeof GetCategories>>
    >
    getCategoriesForAReviewRequest: (
      ...args: Parameters<typeof GetCategoriesForAReviewRequest>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetCategoriesForAReviewRequest>>,
      Effect.Effect.Error<ReturnType<typeof GetCategoriesForAReviewRequest>>
    >
  }
>() {}

export const { getCategories, getCategoriesForAReviewRequest } = Effect.serviceFunctions(OpenAlexWorks)

const make: Effect.Effect<typeof OpenAlexWorks.Service, never, OpenAlex.OpenAlex> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<OpenAlex.OpenAlex>(), Context.omit(Scope.Scope))

  return {
    getCategories: flow(GetCategories, Effect.provide(context)),
    getCategoriesForAReviewRequest: flow(GetCategoriesForAReviewRequest, Effect.provide(context)),
  }
})

export const layer = Layer.effect(OpenAlexWorks, make)
