import { Array, Context, Effect, Layer, Match, pipe, Scope, Struct } from 'effect'
import type { Crossref, Datacite, JapanLinkCenter, Philsci } from '../../ExternalApis/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import { getPreprintFromCrossref, isCrossrefPreprintId } from './Crossref/index.ts'
import { getPreprintFromDatacite, isDatacitePreprintId } from './Datacite/index.ts'
import { getPreprintFromJapanLinkCenter, isJapanLinkCenterPreprintId } from './JapanLinkCenter/index.ts'
import { getPreprintFromPhilsci } from './Philsci/index.ts'

export const layer = Layer.effect(
  Preprints.Preprints,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(
      Effect.context<Crossref.Crossref | Datacite.Datacite | JapanLinkCenter.JapanLinkCenter | Philsci.Philsci>(),
      Context.omit(Scope.Scope),
    )

    const getPreprintFromSource = pipe(
      Match.type<Preprints.IndeterminatePreprintId>(),
      Match.tag('PhilsciPreprintId', getPreprintFromPhilsci),
      Match.when(isCrossrefPreprintId, getPreprintFromCrossref),
      Match.when(isDatacitePreprintId, getPreprintFromDatacite),
      Match.when(isJapanLinkCenterPreprintId, getPreprintFromJapanLinkCenter),
      Match.exhaustive,
    )

    return {
      getPreprint: id =>
        pipe(
          getPreprintFromSource(id),
          Effect.catchTag('NotAPreprint', error => new Preprints.PreprintIsNotFound({ cause: error })),
          Effect.provide(context),
          Effect.withSpan('Preprints.getPreprint', { attributes: { id } }),
        ),
      getPreprintTitle: id =>
        pipe(
          getPreprintFromSource(id),
          Effect.map(preprint => ({
            id: preprint.id,
            language: preprint.title.language,
            title: preprint.title.text,
          })),
          Effect.catchTag('NotAPreprint', error => new Preprints.PreprintIsNotFound({ cause: error })),
          Effect.provide(context),
          Effect.withSpan('Preprints.getPreprintTitle', { attributes: { id } }),
        ),
      resolvePreprintId: (...ids: Array.NonEmptyReadonlyArray<Preprints.IndeterminatePreprintId>) =>
        pipe(
          Array.map(ids, getPreprintFromSource),
          Effect.raceAll,
          Effect.map(Struct.get('id')),
          Effect.provide(context),
          Effect.withSpan('Preprints.resolvePreprintId', { attributes: { ids } }),
        ),
      getPreprintId: pipe(
        Match.type<Preprints.IndeterminatePreprintId>(),
        Match.tag('BiorxivOrMedrxivPreprintId', 'OsfOrLifecycleJournalPreprintId', 'ZenodoOrAfricarxivPreprintId', id =>
          pipe(
            getPreprintFromSource(id),
            Effect.map(Struct.get('id')),
            Effect.provide(context),
            Effect.withSpan('Preprints.getPreprintId', { attributes: { id } }),
          ),
        ),
        Match.orElse(id => Effect.succeed(id)),
      ),
    }
  }),
)
