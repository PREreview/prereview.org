import type { FetchHttpClient, HttpClient } from '@effect/platform'
import { Array, Context, Effect, flow, Layer, Match, pipe, Struct } from 'effect'
import type { Crossref, JapanLinkCenter, Philsci } from '../ExternalApis/index.js'
import * as Preprint from '../preprint.js'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'
import { getPreprintFromCrossref, isCrossrefPreprintId } from './Crossref/index.js'
import { getPreprintFromDatacite, isDatacitePreprintId } from './Datacite/index.js'
import { getPreprintFromJapanLinkCenter, isJapanLinkCenterPreprintId } from './JapanLinkCenter/index.js'
import { getPreprintFromPhilsci } from './Philsci/index.js'

export class Preprints extends Context.Tag('Preprints')<
  Preprints,
  {
    getPreprint: (
      id: IndeterminatePreprintId,
    ) => Effect.Effect<Preprint.Preprint, Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
    getPreprintId: (id: IndeterminatePreprintId) => Effect.Effect<PreprintId, Preprint.PreprintIsUnavailable>
    getPreprintTitle: (
      id: IndeterminatePreprintId,
    ) => Effect.Effect<Preprint.PreprintTitle, Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
    resolvePreprintId: (
      ...ids: Array.NonEmptyReadonlyArray<IndeterminatePreprintId>
    ) => Effect.Effect<PreprintId, Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
  }
>() {}

export const { getPreprint, getPreprintId, getPreprintTitle, resolvePreprintId } = Effect.serviceFunctions(Preprints)

export const layer = Layer.effect(
  Preprints,
  Effect.gen(function* () {
    const context = yield* Effect.context<
      | FetchHttpClient.Fetch
      | HttpClient.HttpClient
      | Crossref.Crossref
      | JapanLinkCenter.JapanLinkCenter
      | Philsci.Philsci
    >()

    const getPreprintFromSource = pipe(
      Match.type<IndeterminatePreprintId>(),
      Match.tag('PhilsciPreprintId', getPreprintFromPhilsci),
      Match.when(isCrossrefPreprintId, getPreprintFromCrossref),
      Match.when(isDatacitePreprintId, getPreprintFromDatacite),
      Match.when(isJapanLinkCenterPreprintId, getPreprintFromJapanLinkCenter),
      Match.exhaustive,
    )

    return {
      getPreprint: flow(
        getPreprintFromSource,
        Effect.catchTag('NotAPreprint', error => new Preprint.PreprintIsNotFound({ cause: error })),
        Effect.provide(context),
      ),
      getPreprintTitle: flow(
        getPreprintFromSource,
        Effect.map(preprint => ({
          id: preprint.id,
          language: preprint.title.language,
          title: preprint.title.text,
        })),
        Effect.catchTag('NotAPreprint', error => new Preprint.PreprintIsNotFound({ cause: error })),
        Effect.provide(context),
      ),
      resolvePreprintId: (...ids: Array.NonEmptyReadonlyArray<IndeterminatePreprintId>) =>
        pipe(
          Array.map(ids, getPreprintFromSource),
          Effect.raceAll,
          Effect.map(Struct.get('id')),
          Effect.provide(context),
        ),
      getPreprintId: pipe(
        Match.type<IndeterminatePreprintId>(),
        Match.tag(
          'BiorxivOrMedrxivPreprintId',
          'OsfOrLifecycleJournalPreprintId',
          'ZenodoOrAfricarxivPreprintId',
          flow(
            getPreprintFromSource,
            Effect.map(Struct.get('id')),
            Effect.catchTag(
              'NotAPreprint',
              'PreprintIsNotFound',
              error => new Preprint.PreprintIsUnavailable({ cause: error }),
            ),
            Effect.provide(context),
          ),
        ),
        Match.orElse(id => Effect.succeed(id)),
      ),
    }
  }),
)
