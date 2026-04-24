import { FetchHttpClient } from '@effect/platform'
import { Context, Effect, Layer, pipe, Redacted } from 'effect'
import * as Commands from '../Commands.ts'
import { UnableToHandleCommand } from '../Commands.ts'
import * as LegacyPrereview from '../legacy-prereview.ts'
import * as Queries from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/index.ts'
import { possiblePseudonyms } from '../types/Pseudonym.ts'
import { GetAvailablePseudonym } from './GetAvailablePseudonym.ts'
import { GetPseudonym } from './GetPseudonym.ts'
import { ImportRegisteredPrereviewer } from './ImportRegisteredPrereviewer.ts'
import { IsRegistered } from './IsRegistered.ts'
import { ListAllPrereviewersForStats } from './ListAllPrereviewersForStats.ts'

export class Prereviewers extends Context.Tag('Prereviewers')<
  Prereviewers,
  {
    legacyRegister: (orcidId: OrcidId.OrcidId) => Effect.Effect<void, UnableToHandleCommand>
    register: (orcidId: OrcidId.OrcidId) => Effect.Effect<void, UnableToHandleCommand>
    isRegistered: Queries.FromOnDemandQuery<typeof IsRegistered>
    getPseudonym: Queries.FromOnDemandQuery<typeof GetPseudonym>
    listAllPrereviewersForStats: Queries.FromStatefulQuery<typeof ListAllPrereviewersForStats>
    importRegisteredOrcidId: (
      orcidId: OrcidId.OrcidId,
    ) => ReturnType<Commands.FromCommand<typeof ImportRegisteredPrereviewer>>
    importRegisteredPrereviewer: Commands.FromCommand<typeof ImportRegisteredPrereviewer>
  }
>() {}

export const { listAllPrereviewersForStats } = Effect.serviceFunctions(Prereviewers)

export const layer = Layer.effect(
  Prereviewers,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereview.LegacyPrereviewApi

    const importRegisteredPrereviewer = yield* Commands.makeCommand(ImportRegisteredPrereviewer)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getAvailablePseudonym = yield* pipe(
      possiblePseudonyms,
      Effect.andThen(GetAvailablePseudonym),
      Effect.andThen(Queries.makeStatefulQuery),
    )

    return {
      legacyRegister: orcid =>
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
      register: () => new UnableToHandleCommand({ cause: 'Not implemented' }),
      isRegistered: yield* Queries.makeOnDemandQuery(IsRegistered),
      getPseudonym: yield* Queries.makeOnDemandQuery(GetPseudonym),
      listAllPrereviewersForStats: yield* Queries.makeStatefulQuery(ListAllPrereviewersForStats),
      importRegisteredOrcidId: orcid =>
        pipe(
          FptsToEffect.readerTaskEither(LegacyPrereview.getUserFromLegacyPrereview(orcid), {
            fetch,
            legacyPrereviewApi: {
              app: legacyPrereviewApi.app,
              key: Redacted.value(legacyPrereviewApi.key),
              url: legacyPrereviewApi.origin,
            },
          }),
          Effect.mapError(() => new UnableToHandleCommand({ cause: 'Legacy user API unavailable' })),
          Effect.andThen(({ pseudonym, createdAt }) =>
            importRegisteredPrereviewer({ orcidId: orcid, pseudonym, registeredAt: createdAt }),
          ),
        ),
      importRegisteredPrereviewer,
    }
  }),
)
