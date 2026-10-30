import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { GetPersonalDetails } from './GetPersonalDetails/index.ts'
import type { OrcidApi } from './OrcidApi.ts'

export * from './OrcidApi.ts'

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

export const getPersonalDetails = (...args: Parameters<(typeof Orcid.Service)['getPersonalDetails']>) =>
  Effect.flatMap(Orcid, service => service.getPersonalDetails(...args))

const make: Effect.Effect<typeof Orcid.Service, never, HttpClient.HttpClient | OrcidApi> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient | OrcidApi>(), Context.omit(Scope.Scope))

  return {
    getPersonalDetails: flow(GetPersonalDetails, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Orcid, make)
