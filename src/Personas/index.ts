import { Context, Data, Effect, Layer } from 'effect'
import type { Orcid } from '../types/index.js'
import type { PseudonymPersona, PublicPersona } from './Persona.js'

export * from './Persona.js'

export class UnableToGetPersona extends Data.TaggedError('UnableToGetPersona')<{ cause?: unknown }> {}

export class Personas extends Context.Tag('Personas')<
  Personas,
  {
    getPublicPersona: (orcidId: Orcid.Orcid) => Effect.Effect<PublicPersona, UnableToGetPersona>
    getPseudonymPersona: (orcidId: Orcid.Orcid) => Effect.Effect<PseudonymPersona, UnableToGetPersona>
  }
>() {}

export const { getPublicPersona, getPseudonymPersona } = Effect.serviceFunctions(Personas)

const make: Effect.Effect<typeof Personas.Service> = Effect.sync(() => {
  return {
    getPublicPersona: () => new UnableToGetPersona({ cause: 'not implemented' }),
    getPseudonymPersona: () => new UnableToGetPersona({ cause: 'not implemented' }),
  }
})

export const layer = Layer.effect(Personas, make)
