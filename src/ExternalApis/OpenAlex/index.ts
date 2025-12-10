import type { HttpClient } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Context, Effect, flow, Layer, pipe, Scope } from 'effect'
import { GetWork } from './GetWork/index.ts'
import { getCategories, type WorkIsNotFound, WorkIsUnavailable } from './Work.ts'

export class GetCategories extends Context.Tag('GetCategories')<
  GetCategories,
  (doi: Doi.Doi) => Effect.Effect<ReadonlyArray<{ id: URL; display_name: string }>, WorkIsNotFound | WorkIsUnavailable>
>() {}

export { WorkIsNotFound, WorkIsUnavailable, WorkSchema, type Work } from './Work.ts'

export class OpenAlex extends Context.Tag('OpenAlex')<
  OpenAlex,
  {
    getWork: (
      ...args: Parameters<typeof GetWork>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetWork>>,
      Effect.Effect.Error<ReturnType<typeof GetWork>>
    >
  }
>() {}

export const { getWork } = Effect.serviceFunctions(OpenAlex)

const make: Effect.Effect<typeof OpenAlex.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    getWork: flow(GetWork, Effect.provide(context)),
  }
})

export const layer = Layer.effect(OpenAlex, make)

export const getCategoriesFromOpenAlex = (doi: Doi.Doi) =>
  pipe(
    getWork(doi),
    Effect.timeout('2 seconds'),
    Effect.andThen(getCategories),
    Effect.catchTag('TimeoutException', error => new WorkIsUnavailable({ cause: error })),
  )
