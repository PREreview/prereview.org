import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { OpenAlex } from '../../ExternalApis/index.ts'
import { GetCategories } from './GetCategories/index.ts'

export class OpenAlexWorks extends Context.Tag('OpenAlexWorks')<
  OpenAlexWorks,
  {
    getCategories: (
      ...args: Parameters<typeof GetCategories>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetCategories>>,
      Effect.Effect.Error<ReturnType<typeof GetCategories>>
    >
  }
>() {}

export const { getCategories } = Effect.serviceFunctions(OpenAlexWorks)

const make: Effect.Effect<typeof OpenAlexWorks.Service, never, OpenAlex.OpenAlex> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<OpenAlex.OpenAlex>(), Context.omit(Scope.Scope))

  return {
    getCategories: flow(GetCategories, Effect.provide(context)),
  }
})

export const layer = Layer.effect(OpenAlexWorks, make)
