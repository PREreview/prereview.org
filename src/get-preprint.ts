import type { FetchEnv } from 'fetch-fp-ts'
import { flow, identity } from 'fp-ts/lib/function.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match, P, P as p } from 'ts-pattern'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref.js'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite.js'
import { type SleepEnv, useStaleCache } from './fetch.js'
import { getPreprintFromPhilsci } from './philsci.js'
import type { IndeterminatePreprintId, PreprintId } from './types/preprint-id.js'

export const getPreprintFromSource = (id: IndeterminatePreprintId) =>
  match(id)
    .with({ type: 'jxiv' }, () => RTE.left('unavailable' as const))
    .with({ type: 'philsci' }, getPreprintFromPhilsci)
    .with({ value: p.when(isCrossrefPreprintDoi) }, getPreprintFromCrossref)
    .with({ value: p.when(isDatacitePreprintDoi) }, getPreprintFromDatacite)
    .exhaustive()

export const getPreprint = flow(
  getPreprintFromSource,
  RTE.mapLeft(error =>
    match(error)
      .with('not-a-preprint', () => 'not-found' as const)
      .otherwise(identity),
  ),
)

export const getPreprintTitle = flow(
  getPreprint,
  RTE.local(useStaleCache()),
  RTE.map(preprint => ({
    id: preprint.id,
    language: preprint.title.language,
    title: preprint.title.text,
  })),
)

export const resolvePreprintId = flow(
  getPreprintFromSource,
  RTE.local(useStaleCache()),
  RTE.map(preprint => preprint.id),
)

export const getPreprintId = (
  id: IndeterminatePreprintId,
): RTE.ReaderTaskEither<FetchEnv & SleepEnv, 'unavailable', PreprintId> =>
  match(id)
    .with(
      { type: P.union('biorxiv-medrxiv', 'zenodo-africarxiv') },
      flow(
        resolvePreprintId,
        RTE.mapLeft(() => 'unavailable' as const),
      ),
    )
    .otherwise(RTE.right)

export const doesPreprintExist = flow(
  resolvePreprintId,
  RTE.map(() => true),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(false))
      .with('not-a-preprint', RTE.left)
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)
