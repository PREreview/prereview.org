import { FetchHttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Match, pipe, Redacted } from 'effect'
import { UnableToHandleCommand } from '../Commands.ts'
import * as LegacyPrereview from '../legacy-prereview.ts'
import { UnableToQuery } from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/index.ts'

export class Prereviewers extends Context.Tag('Prereviewers')<
  Prereviewers,
  {
    register: (orcidId: OrcidId.OrcidId) => Effect.Effect<void, UnableToHandleCommand>
    isRegistered: (orcidId: OrcidId.OrcidId) => Effect.Effect<boolean, UnableToQuery>
    importRegisteredOrcidId: (orcidId: OrcidId.OrcidId) => Effect.Effect<void, UnableToHandleCommand>
  }
>() {}

export const layer = Layer.effect(
  Prereviewers,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereview.LegacyPrereviewApi

    return {
      register: orcid =>
        pipe(
          FptsToEffect.readerTaskEither(LegacyPrereview.createUserOnLegacyPrereview({ name: orcid, orcid }), {
            fetch,
            legacyPrereviewApi: {
              app: legacyPrereviewApi.app,
              key: Redacted.value(legacyPrereviewApi.key),
              url: legacyPrereviewApi.origin,
            },
          }),
          Effect.asVoid,
          Effect.mapError(() => new UnableToHandleCommand({ cause: 'Legacy user API unavailable' })),
        ),
      isRegistered: orcid =>
        pipe(
          FptsToEffect.readerTaskEither(LegacyPrereview.getPseudonymFromLegacyPrereview(orcid), {
            fetch,
            legacyPrereviewApi: {
              app: legacyPrereviewApi.app,
              key: Redacted.value(legacyPrereviewApi.key),
              url: legacyPrereviewApi.origin,
            },
          }),
          Effect.andThen(true),
          Effect.catchAll(
            flow(
              Match.value,
              Match.when('unavailable', () => new UnableToQuery({ cause: 'Legacy user API unavailable' })),
              Match.when('not-found', () => Effect.succeed(false)),
              Match.exhaustive,
            ),
          ),
        ),
      importRegisteredOrcidId: () => Effect.void,
    }
  }),
)
