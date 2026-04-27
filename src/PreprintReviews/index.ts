import { Array, Context, Effect, Layer, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import * as Personas from '../Personas/index.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import * as Queries from '../Queries.ts'
import { GetRapidPrereviewsForAPreprint, type RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
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
    const personas = yield* Personas.Personas

    const getRapidPrereviewsForAPreprint = yield* Queries.makeOnDemandQuery(GetRapidPrereviewsForAPreprint)

    return {
      getRapidPrereviewsForAPreprint: id =>
        pipe(
          getRapidPrereviewsForAPreprint(id),
          Effect.andThen(
            Array.map(
              Effect.fnUntraced(
                function* (rapidPrereview) {
                  const persona = yield* Personas.getPersona(rapidPrereview.author)

                  return { ...rapidPrereview, author: persona } satisfies RapidPrereview
                },
                Effect.provideService(Personas.Personas, personas),
              ),
            ),
          ),
          Effect.andThen(Effect.allWith({ concurrency: 'inherit' })),
          Effect.catchTag('UnableToGetPersona', error => new Queries.UnableToQuery({ cause: error })),
          Effect.withSpan('PreprintReviews.getRapidPrereviewsForAPreprint', { attributes: { id } }),
        ),
      importRapidPrereview: yield* Commands.makeCommand(ImportRapidPrereview),
    }
  }),
)
