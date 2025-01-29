import type { Effect } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import { flow, identity } from 'fp-ts/lib/function.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match, P, P as p } from 'ts-pattern'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref.js'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite.js'
import * as EffectToFpTs from './EffectToFpts.js'
import { type SleepEnv, useStaleCache } from './fetch.js'
import type { EnvFor } from './Fpts.js'
import { getPreprintFromJapanLinkCenter, isJapanLinkCenterPreprintDoi } from './JapanLinkCenter/index.js'
import { getPreprintFromPhilsci } from './philsci.js'
import * as Preprint from './preprint.js'
import type { IndeterminatePreprintId, PreprintId } from './types/preprint-id.js'

export const getPreprintFromSource = (id: IndeterminatePreprintId) =>
  match(id)
    .returnType<
      RTE.ReaderTaskEither<
        FetchEnv &
          SleepEnv &
          EffectToFpTs.EffectEnv<Effect.Effect.Context<ReturnType<typeof getPreprintFromJapanLinkCenter>>>,
        Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
        Preprint.Preprint
      >
    >()
    .with({ type: 'philsci' }, getPreprintFromPhilsci)
    .with({ value: p.when(isCrossrefPreprintDoi) }, getPreprintFromCrossref)
    .with({ value: p.when(isDatacitePreprintDoi) }, getPreprintFromDatacite)
    .with(
      { value: p.when(isJapanLinkCenterPreprintDoi) },
      EffectToFpTs.toReaderTaskEitherK(getPreprintFromJapanLinkCenter),
    )
    .exhaustive()

export const getPreprint = flow(
  getPreprintFromSource,
  RTE.mapLeft(error =>
    match(error)
      .with({ _tag: 'NotAPreprint' }, () => new Preprint.PreprintIsNotFound())
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
): RTE.ReaderTaskEither<EnvFor<ReturnType<typeof resolvePreprintId>>, Preprint.PreprintIsUnavailable, PreprintId> =>
  match(id)
    .with(
      { type: P.union('biorxiv-medrxiv', 'zenodo-africarxiv') },
      flow(
        resolvePreprintId,
        RTE.mapLeft(() => new Preprint.PreprintIsUnavailable()),
      ),
    )
    .otherwise(RTE.right)

export const doesPreprintExist = flow(
  resolvePreprintId,
  RTE.map(() => true),
  RTE.orElseW(error =>
    match(error)
      .with({ _tag: 'PreprintIsNotFound' }, () => RTE.right(false))
      .with({ _tag: P.union('NotAPreprint', 'PreprintIsUnavailable') }, RTE.left)
      .exhaustive(),
  ),
)
