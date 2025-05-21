import { FetchHttpClient, HttpClient } from '@effect/platform'
import { Array, Context, Effect, flow, Layer, Match, pipe, Struct } from 'effect'
import { getPreprintFromCrossref, type IndeterminateCrossrefPreprintId, isCrossrefPreprintDoi } from '../crossref.js'
import * as Crossref from '../Crossref/index.js'
import { getPreprintFromDatacite, type IndeterminateDatacitePreprintId, isDatacitePreprintDoi } from '../datacite.js'
import * as Datacite from '../Datacite/index.js'
import * as FptsToEffect from '../FptsToEffect.js'
import * as JapanLinkCenter from '../JapanLinkCenter/index.js'
import { getPreprintFromPhilsci } from '../philsci.js'
import * as Preprint from '../preprint.js'
import type { IndeterminatePreprintId, PhilsciPreprintId, PreprintId } from '../types/preprint-id.js'

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

export const getPreprint = Effect.fn(function* (...args: Parameters<(typeof Preprints.Service)['getPreprint']>) {
  const preprints = yield* Preprints

  return yield* preprints.getPreprint(...args)
})

export const getPreprintId = Effect.fn(function* (...args: Parameters<(typeof Preprints.Service)['getPreprintId']>) {
  const preprints = yield* Preprints

  return yield* preprints.getPreprintId(...args)
})

export const getPreprintTitle = Effect.fn(function* (
  ...args: Parameters<(typeof Preprints.Service)['getPreprintTitle']>
) {
  const preprints = yield* Preprints

  return yield* preprints.getPreprintTitle(...args)
})

export const resolvePreprintId = Effect.fn(function* (
  ...args: Parameters<(typeof Preprints.Service)['resolvePreprintId']>
) {
  const preprints = yield* Preprints

  return yield* preprints.resolvePreprintId(...args)
})

export const layer = Layer.effect(
  Preprints,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const httpClient = yield* HttpClient.HttpClient

    const isCrossrefPreprintIdHandledByLegacyAdapter = (
      id: Exclude<IndeterminatePreprintId, PhilsciPreprintId>,
    ): id is IndeterminateCrossrefPreprintId => isCrossrefPreprintDoi(id.value)

    const getPreprintFromSource = pipe(
      Match.type<IndeterminatePreprintId>(),
      Match.when({ _tag: 'philsci' }, id => FptsToEffect.readerTaskEither(getPreprintFromPhilsci(id), { fetch })),
      Match.when(isCrossrefPreprintIdHandledByLegacyAdapter, id =>
        FptsToEffect.readerTaskEither(getPreprintFromCrossref(id), { fetch }),
      ),
      Match.when(Crossref.isCrossrefPreprintId, Crossref.getPreprintFromCrossref),
      Match.when(
        (id): id is IndeterminateDatacitePreprintId => isDatacitePreprintDoi(id.value),
        id => FptsToEffect.readerTaskEither(getPreprintFromDatacite(id), { fetch }),
      ),
      Match.when(Datacite.isDatacitePreprintId, Datacite.getPreprintFromDatacite),
      Match.when(JapanLinkCenter.isJapanLinkCenterPreprintId, JapanLinkCenter.getPreprintFromJapanLinkCenter),
      Match.exhaustive,
    )

    return {
      getPreprint: flow(
        getPreprintFromSource,
        Effect.catchTag('NotAPreprint', error => new Preprint.PreprintIsNotFound({ cause: error })),
        Effect.provideService(HttpClient.HttpClient, httpClient),
      ),
      getPreprintTitle: flow(
        getPreprintFromSource,
        Effect.map(preprint => ({
          id: preprint.id,
          language: preprint.title.language,
          title: preprint.title.text,
        })),
        Effect.catchTag('NotAPreprint', error => new Preprint.PreprintIsNotFound({ cause: error })),
        Effect.provideService(HttpClient.HttpClient, httpClient),
      ),
      resolvePreprintId: (...ids: Array.NonEmptyReadonlyArray<IndeterminatePreprintId>) =>
        pipe(
          Array.map(ids, getPreprintFromSource),
          Effect.raceAll,
          Effect.map(Struct.get('id')),
          Effect.provideService(HttpClient.HttpClient, httpClient),
        ),
      getPreprintId: pipe(
        Match.type<IndeterminatePreprintId>(),
        Match.tag(
          'biorxiv-medrxiv',
          'osf-lifecycle-journal',
          'zenodo-africarxiv',
          flow(
            getPreprintFromSource,
            Effect.map(Struct.get('id')),
            Effect.catchTag(
              'NotAPreprint',
              'PreprintIsNotFound',
              error => new Preprint.PreprintIsUnavailable({ cause: error }),
            ),
            Effect.provideService(HttpClient.HttpClient, httpClient),
          ),
        ),
        Match.orElse(id => Effect.succeed(id)),
      ),
    }
  }),
)
