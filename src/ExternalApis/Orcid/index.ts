import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer } from 'effect'
import { GetPersonalDetails } from './GetPersonalDetails/index.js'
import type { OrcidApi } from './OrcidApi.js'

export * from './legacy-orcid.js'
export * from './OrcidApi.js'

export class Orcid extends Context.Tag('Orcid')<
  Orcid,
  {
    getPersonalDetails: (
      ...args: Parameters<typeof GetPersonalDetails>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetPersonalDetails>>,
      Effect.Effect.Error<ReturnType<typeof GetPersonalDetails>>
    >
  }
>() {}

export const { getPersonalDetails } = Effect.serviceFunctions(Orcid)

const make: Effect.Effect<typeof Orcid.Service, never, HttpClient.HttpClient | OrcidApi> = Effect.gen(function* () {
  const context = yield* Effect.context<HttpClient.HttpClient | OrcidApi>()

  return {
    getPersonalDetails: flow(GetPersonalDetails, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Orcid, make)
