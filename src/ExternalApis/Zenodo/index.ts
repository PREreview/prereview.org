import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { CreateDeposition } from './CreateDeposition/index.ts'
import { GetDeposition } from './GetDeposition/index.ts'
import { PublishDeposition } from './PublishDeposition/index.ts'
import { UploadFile } from './UploadFile/index.ts'
import type { ZenodoApi } from './ZenodoApi.ts'

export * from './Deposition.ts'
export { type File } from './UploadFile/index.ts'
export { ZenodoApi } from './ZenodoApi.ts'

export class Zenodo extends Context.Tag('Zenodo')<
  Zenodo,
  {
    createDeposition: (
      ...args: Parameters<typeof CreateDeposition>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof CreateDeposition>>,
      Effect.Effect.Error<ReturnType<typeof CreateDeposition>>
    >
    getDeposition: (
      ...args: Parameters<typeof GetDeposition>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetDeposition>>,
      Effect.Effect.Error<ReturnType<typeof GetDeposition>>
    >
    publishDeposition: (
      ...args: Parameters<typeof PublishDeposition>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof PublishDeposition>>,
      Effect.Effect.Error<ReturnType<typeof PublishDeposition>>
    >
    uploadFile: (
      ...args: Parameters<typeof UploadFile>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof UploadFile>>,
      Effect.Effect.Error<ReturnType<typeof UploadFile>>
    >
  }
>() {}

export const { createDeposition, getDeposition, publishDeposition, uploadFile } = Effect.serviceFunctions(Zenodo)

const make: Effect.Effect<typeof Zenodo.Service, never, HttpClient.HttpClient | ZenodoApi> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<HttpClient.HttpClient | ZenodoApi>(), Context.omit(Scope.Scope))

  return {
    createDeposition: flow(CreateDeposition, Effect.provide(context)),
    getDeposition: flow(GetDeposition, Effect.provide(context)),
    publishDeposition: flow(PublishDeposition, Effect.provide(context)),
    uploadFile: flow(UploadFile, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Zenodo, make)
