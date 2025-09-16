import { FetchHttpClient } from '@effect/platform'
import { Context, Data, Effect, Layer, Match, pipe, Redacted } from 'effect'
import { Orcid } from '../ExternalApis/index.js'
import * as FptsToEffect from '../FptsToEffect.js'
import { getPseudonymFromLegacyPrereview, LegacyPrereviewApi } from '../legacy-prereview.js'
import type { OrcidId } from '../types/index.js'
import { GetNameFromOrcidPersonalDetails } from './GetNameFromOrcidPersonalDetails.js'
import { PseudonymPersona, PublicPersona, type Persona } from './Persona.js'

export * from './Persona.js'

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

const make: Effect.Effect<typeof Personas.Service, never, FetchHttpClient.Fetch | LegacyPrereviewApi | Orcid.Orcid> =
  Effect.gen(function* () {
    const context = yield* Effect.context<Orcid.Orcid>()
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereviewApi

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
          FptsToEffect.readerTaskEither(getPseudonymFromLegacyPrereview(orcidId), {
            fetch,
            legacyPrereviewApi: {
              app: legacyPrereviewApi.app,
              key: Redacted.value(legacyPrereviewApi.key),
              url: legacyPrereviewApi.origin,
              update: legacyPrereviewApi.update,
            },
          }),
          Effect.mapError(error => new UnableToGetPersona({ cause: error })),
          Effect.andThen(pseudonym => new PseudonymPersona({ pseudonym })),
        ),
    }
  })

export const layer = Layer.effect(Personas, make)
