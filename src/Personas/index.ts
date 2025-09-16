import { FetchHttpClient } from '@effect/platform'
import { Context, Data, Effect, Layer, Match, Option, pipe, Redacted } from 'effect'
import { DeprecatedLoggerEnv } from '../Context.js'
import { Orcid } from '../ExternalApis/index.js'
import * as FptsToEffect from '../FptsToEffect.js'
import { getPseudonymFromLegacyPrereview, LegacyPrereviewApi } from '../legacy-prereview.js'
import type { OrcidId } from '../types/index.js'
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

const make: Effect.Effect<
  typeof Personas.Service,
  never,
  FetchHttpClient.Fetch | LegacyPrereviewApi | Orcid.OrcidApi | DeprecatedLoggerEnv
> = Effect.gen(function* () {
  const fetch = yield* FetchHttpClient.Fetch
  const legacyPrereviewApi = yield* LegacyPrereviewApi
  const orcidApi = yield* Orcid.OrcidApi
  const loggerEnv = yield* DeprecatedLoggerEnv

  return {
    getPublicPersona: orcidId =>
      pipe(
        FptsToEffect.readerTaskEither(Orcid.getNameFromOrcid(orcidId), {
          fetch,
          orcidApiUrl: orcidApi.origin,
          orcidApiToken: Option.getOrUndefined(Option.map(orcidApi.token, Redacted.value)),
          ...loggerEnv,
        }),
        Effect.mapError(error => new UnableToGetPersona({ cause: error })),
        Effect.filterOrElse(
          name => typeof name === 'string',
          () => new UnableToGetPersona({ cause: 'name is undefined' }),
        ),
        Effect.andThen(name => new PublicPersona({ name, orcidId })),
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
