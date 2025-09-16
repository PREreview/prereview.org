import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { CreateDeposition } from './CreateDeposition/index.js'
import { GetDeposition } from './GetDeposition/index.js'
import { PublishDeposition } from './PublishDeposition/index.js'
import { UploadFile } from './UploadFile/index.js'
import type { ZenodoApi } from './ZenodoApi.js'

export * from './Deposition.js'
export { type File } from './UploadFile/index.js'
export { ZenodoApi } from './ZenodoApi.js'

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
  const context = yield* Effect.context<HttpClient.HttpClient | ZenodoApi>()

  return {
    createDeposition: flow(CreateDeposition, Effect.provide(context)),
    getDeposition: flow(GetDeposition, Effect.provide(context)),
    publishDeposition: flow(PublishDeposition, Effect.provide(context)),
    uploadFile: flow(UploadFile, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Zenodo, make)
