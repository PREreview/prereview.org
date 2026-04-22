import { Context, Data, Effect, Layer, Match, pipe, Scope } from 'effect'
import { Orcid } from '../ExternalApis/index.ts'
import { Prereviewers } from '../Prereviewers/index.ts'
import type { OrcidId } from '../types/index.ts'
import { GetNameFromOrcidPersonalDetails } from './GetNameFromOrcidPersonalDetails.ts'
import { PseudonymPersona, PublicPersona, type Persona } from './Persona.ts'

export * from './Persona.ts'

export class UnableToGetPersona extends Data.TaggedError('UnableToGetPersona')<{ cause?: unknown }> {}

export class Personas extends Context.Tag('Personas')<
  Personas,
  {
    getPublicPersona: (orcidId: OrcidId.OrcidId) => Effect.Effect<PublicPersona, UnableToGetPersona>
    getPseudonymPersona: (orcidId: OrcidId.OrcidId) => Effect.Effect<PseudonymPersona, UnableToGetPersona>
  }
>() {}

export const { getPublicPersona, getPseudonymPersona } = Effect.serviceFunctions(Personas)

export const getPersona = pipe(
  Match.type<{ orcidId: OrcidId.OrcidId; persona: 'public' | 'pseudonym' }>(),
  Match.withReturnType<Effect.Effect<Persona, UnableToGetPersona, Personas>>(),
  Match.when({ persona: 'public' }, ({ orcidId }) => getPublicPersona(orcidId)),
  Match.when({ persona: 'pseudonym' }, ({ orcidId }) => getPseudonymPersona(orcidId)),
  Match.exhaustive,
)

const make: Effect.Effect<typeof Personas.Service, never, Prereviewers | Orcid.Orcid> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<Orcid.Orcid>(), Context.omit(Scope.Scope))
  const prereviewers = yield* Prereviewers

  return {
    getPublicPersona: orcidId =>
      pipe(
        Orcid.getPersonalDetails(orcidId),
        Effect.andThen(GetNameFromOrcidPersonalDetails),
        Effect.mapBoth({
          onSuccess: name => new PublicPersona({ name, orcidId }),
          onFailure: error => new UnableToGetPersona({ cause: error }),
        }),
        Effect.provide(context),
      ),
    getPseudonymPersona: orcidId =>
      pipe(
        prereviewers.getPseudonym(orcidId),
        Effect.mapError(error => new UnableToGetPersona({ cause: error })),
        Effect.andThen(pseudonym => new PseudonymPersona({ pseudonym })),
      ),
  }
})

export const layer = Layer.effect(Personas, make)
