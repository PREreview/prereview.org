import type { HttpClient } from '@effect/platform'
import { Context, Effect, Layer } from 'effect'
import type { GetPersonalDetails } from './GetPersonalDetails/index.js'
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

const make: Effect.Effect<typeof Orcid.Service, never, HttpClient.HttpClient | OrcidApi> = Effect.sync(() => {
  return {
    getPersonalDetails: () => Effect.dieMessage('not implemented'),
  }
})

export const layer = Layer.effect(Orcid, make)
