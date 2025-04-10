import { FetchHttpClient } from '@effect/platform'
import { Effect, flow, Match, pipe } from 'effect'
import { DeprecatedSleepEnv } from './Context.js'
import { getPreprintFromCrossref, type IndeterminateCrossrefPreprintId, isCrossrefPreprintDoi } from './crossref.js'
import * as Crossref from './Crossref/index.js'
import { getPreprintFromDatacite, type IndeterminateDatacitePreprintId, isDatacitePreprintDoi } from './datacite.js'
import * as FptsToEffect from './FptsToEffect.js'
import {
  getPreprintFromJapanLinkCenter,
  isJapanLinkCenterPreprintDoi,
  type JapanLinkCenterPreprintId,
} from './JapanLinkCenter/index.js'
import { getPreprintFromPhilsci } from './philsci.js'
import * as Preprint from './preprint.js'
import type { IndeterminatePreprintId, PhilsciPreprintId } from './types/preprint-id.js'

const isCrossrefPreprintIdHandledByLegacyAdapter = (
  id: Exclude<IndeterminatePreprintId, PhilsciPreprintId>,
): id is IndeterminateCrossrefPreprintId => isCrossrefPreprintDoi(id.value)

const getPreprintFromSource = pipe(
  Match.type<IndeterminatePreprintId>(),
  Match.when({ type: 'philsci' }, id =>
    Effect.gen(function* () {
      const fetch = yield* FetchHttpClient.Fetch
      const sleep = yield* DeprecatedSleepEnv

      return yield* FptsToEffect.readerTaskEither(getPreprintFromPhilsci(id), { fetch, ...sleep })
    }),
  ),
  Match.when(Crossref.isCrossrefPreprintId, Crossref.getPreprintFromCrossref),
  Match.when(isCrossrefPreprintIdHandledByLegacyAdapter, id =>
    Effect.gen(function* () {
      const fetch = yield* FetchHttpClient.Fetch
      const sleep = yield* DeprecatedSleepEnv

      return yield* FptsToEffect.readerTaskEither(getPreprintFromCrossref(id), { fetch, ...sleep })
    }),
  ),
  Match.when(
    (id): id is IndeterminateDatacitePreprintId => isDatacitePreprintDoi(id.value),
    id =>
      Effect.gen(function* () {
        const fetch = yield* FetchHttpClient.Fetch
        const sleep = yield* DeprecatedSleepEnv

        return yield* FptsToEffect.readerTaskEither(getPreprintFromDatacite(id), { fetch, ...sleep })
      }),
  ),
  Match.when(
    (id): id is JapanLinkCenterPreprintId => isJapanLinkCenterPreprintDoi(id.value),
    getPreprintFromJapanLinkCenter,
  ),
  Match.exhaustive,
)

export const getPreprint = flow(
  getPreprintFromSource,
  Effect.catchTag('NotAPreprint', error => new Preprint.PreprintIsNotFound({ cause: error })),
)

export const getPreprintTitle = flow(
  getPreprint,

  Effect.map(preprint => ({
    id: preprint.id,
    language: preprint.title.language,
    title: preprint.title.text,
  })),
)

export const resolvePreprintId = flow(
  getPreprintFromSource,
  Effect.map(preprint => preprint.id),
)

export const getPreprintId = pipe(
  Match.type<IndeterminatePreprintId>(),
  Match.when(
    { type: 'biorxiv-medrxiv' },
    flow(
      resolvePreprintId,
      Effect.mapError(error => new Preprint.PreprintIsUnavailable({ cause: error })),
    ),
  ),
  Match.when(
    { type: 'zenodo-africarxiv' },
    flow(
      resolvePreprintId,
      Effect.mapError(error => new Preprint.PreprintIsUnavailable({ cause: error })),
    ),
  ),
  Match.orElse(id => Effect.succeed(id)),
)

export const doesPreprintExist = flow(
  resolvePreprintId,
  Effect.andThen(true),
  Effect.catchTag('PreprintIsNotFound', () => Effect.succeed(false)),
)
