import { FetchHttpClient } from '@effect/platform'
import { Array, Context, Effect, flow, Layer, Match, pipe, Record, Redacted } from 'effect'
import * as Commands from '../Commands.ts'
import {
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  LegacyPrereviewApi,
} from '../legacy-prereview.ts'
import * as Personas from '../Personas/index.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import * as Queries from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import { NonEmptyString } from '../types/NonEmptyString.ts'
import { OrcidId } from '../types/OrcidId.ts'
import { isPseudonym, Pseudonym } from '../types/Pseudonym.ts'
import type { RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
import { ImportRapidPrereview } from './ImportRapidPrereview.ts'

export * from './Errors.ts'
export { ImportRapidPrereviewInput } from './ImportRapidPrereview.ts'
export * from './Reactions/index.ts'

export interface RapidPrereview {
  readonly author: Personas.Persona
  readonly questions: Omit<
    RapidPrereviewForAPreprint['questions'],
    'dataLink' | 'technicalComments' | 'editorialComments'
  >
}

export class PreprintReviews extends Context.Tag('PreprintReviews')<
  PreprintReviews,
  {
    getRapidPrereviewsForAPreprint: (
      preprintId: IndeterminatePreprintId,
    ) => Effect.Effect<ReadonlyArray<RapidPrereview>, Queries.UnableToQuery>
    importRapidPrereview: Commands.FromCommand<typeof ImportRapidPrereview>
  }
>() {}

export const { getRapidPrereviewsForAPreprint } = Effect.serviceFunctions(PreprintReviews)

export const layer = Layer.effect(
  PreprintReviews,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereviewApi

    return {
      getRapidPrereviewsForAPreprint: id =>
        pipe(
          Effect.succeed(id),
          Effect.filterOrFail(isLegacyCompatiblePreprint, () => 'not-compatible' as const),
          Effect.andThen(id =>
            FptsToEffect.readerTaskEither(getRapidPreviewsFromLegacyPrereview(id), {
              fetch,
              legacyPrereviewApi: {
                app: legacyPrereviewApi.app,
                key: Redacted.value(legacyPrereviewApi.key),
                url: legacyPrereviewApi.origin,
              },
            }),
          ),
          Effect.andThen(
            Array.map(prereview => ({
              questions: Record.map(prereview.questions, answer =>
                answer === 'na' ? ('not applicable' as const) : answer,
              ),
              author: isPseudonym(prereview.author.name)
                ? new Personas.PseudonymPersona({ pseudonym: Pseudonym(prereview.author.name) })
                : new Personas.PublicPersona({
                    name: NonEmptyString(prereview.author.name),
                    orcidId: OrcidId(prereview.author.orcid ?? ''),
                  }),
            })),
          ),
          Effect.catchAll(
            flow(
              Match.value,
              Match.when('not-compatible', () => Effect.sync(Array.empty)),
              Match.when('unavailable', () => new Queries.UnableToQuery({})),
              Match.exhaustive,
            ),
          ),
          Effect.withSpan('PreprintReviews.getRapidPrereviewsForAPreprint', { attributes: { id } }),
        ),
      importRapidPrereview: yield* Commands.makeCommand(ImportRapidPrereview),
    }
  }),
)
