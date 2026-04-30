import { Context, Effect, Layer, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import { UnableToHandleCommand } from '../Commands.ts'
import * as Queries from '../Queries.ts'
import { Temporal, type OrcidId } from '../types/index.ts'
import { possiblePseudonyms } from '../types/Pseudonym.ts'
import { CountAvailablePseudonyms } from './CountAvailablePseudonyms.ts'
import { GetAvailablePseudonym } from './GetAvailablePseudonym.ts'
import { GetPseudonym } from './GetPseudonym.ts'
import { IsRegistered } from './IsRegistered.ts'
import { ListAllPrereviewersForStats } from './ListAllPrereviewersForStats.ts'
import { RegisterPrereviewer } from './RegisterPrereviewer.ts'
import { ReplaceLegacyPseudonym } from './ReplaceLegacyPseudonym.ts'

export class Prereviewers extends Context.Tag('Prereviewers')<
  Prereviewers,
  {
    register: (orcidId: OrcidId.OrcidId) => Effect.Effect<void, UnableToHandleCommand>
    replaceLegacyPseudonym: (
      orcid: OrcidId.OrcidId,
    ) => ReturnType<Commands.FromCommand<ReturnType<typeof ReplaceLegacyPseudonym>>>
    isRegistered: Queries.FromOnDemandQuery<typeof IsRegistered>
    getPseudonym: Queries.FromOnDemandQuery<typeof GetPseudonym>
    countAvailablePseudonyms: Queries.FromOnDemandQuery<ReturnType<typeof CountAvailablePseudonyms>>
    listAllPrereviewersForStats: Queries.FromStatefulQuery<typeof ListAllPrereviewersForStats>
  }
>() {}

export const { countAvailablePseudonyms, listAllPrereviewersForStats } = Effect.serviceFunctions(Prereviewers)

export const layer = Layer.effect(
  Prereviewers,
  Effect.gen(function* () {
    const registerPrereviewer = yield* Commands.makeCommand(RegisterPrereviewer)

    const replaceLegacyPseudonym = yield* pipe(
      possiblePseudonyms,
      Effect.andThen(ReplaceLegacyPseudonym),
      Effect.andThen(Commands.makeCommand),
    )

    const getAvailablePseudonym = yield* pipe(
      possiblePseudonyms,
      Effect.andThen(GetAvailablePseudonym),
      Effect.andThen(Queries.makeStatefulQuery),
    )

    const countAvailablePseudonyms = yield* pipe(
      possiblePseudonyms,
      Effect.andThen(CountAvailablePseudonyms),
      Effect.andThen(Queries.makeOnDemandQuery),
    )

    return {
      register: Effect.fn('Prereviewers.register')(
        function* (orcidId) {
          const prereviewer = {
            orcidId,
            registeredAt: yield* Temporal.currentInstant,
            pseudonym: yield* getAvailablePseudonym(),
          }

          yield* registerPrereviewer(prereviewer)
        },
        Effect.catchTag(
          'MismatchWithExistingDataForOrcid',
          'NoPseudonymAvailable',
          'PseudonymAlreadyInUse',
          error => new UnableToHandleCommand({ cause: error }),
        ),
      ),
      replaceLegacyPseudonym: Effect.fnUntraced(
        function* (orcidId) {
          const input = {
            orcidId,
            replacedAt: yield* Temporal.currentInstant,
            pseudonym: yield* getAvailablePseudonym(),
          }

          yield* replaceLegacyPseudonym(input)
        },
        Effect.catchTag('NoPseudonymAvailable', error => new UnableToHandleCommand({ cause: error })),
      ),
      isRegistered: yield* Queries.makeOnDemandQuery(IsRegistered),
      getPseudonym: yield* Queries.makeOnDemandQuery(GetPseudonym),
      countAvailablePseudonyms,
      listAllPrereviewersForStats: yield* Queries.makeStatefulQuery(ListAllPrereviewersForStats),
    }
  }),
)
