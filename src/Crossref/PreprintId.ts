import * as Doi from 'doi-ts'
import { Match, pipe } from 'effect'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

const crossrefDoiPrefixes = ['1101', '1590', '2139', '12688', '20944', '55458'] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

export type CrossrefPreprintId = Extract<PreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export type IndeterminateCrossrefPreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export const isCrossrefPreprintId = (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId =>
  id._tag !== 'philsci' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...crossrefDoiPrefixes)

export const fromCrossrefPreprintDoi = pipe(
  Match.type<Doi.Doi<CrossrefDoiPrefix>>(),
  Match.withReturnType<IndeterminateCrossrefPreprintId>(),
  Match.when(Doi.hasRegistrant('1101'), value => ({ _tag: 'biorxiv-medrxiv', value })),
  Match.when(Doi.hasRegistrant('1590'), value => ({ _tag: 'scielo', value })),
  Match.when(Doi.hasRegistrant('2139'), value => ({ _tag: 'ssrn', value })),
  Match.when(Doi.hasRegistrant('12688'), value => ({ _tag: 'verixiv', value })),
  Match.when(Doi.hasRegistrant('20944'), value => ({ _tag: 'preprints.org', value })),
  Match.when(Doi.hasRegistrant('55458'), value => ({ _tag: 'neurolibre', value })),
  Match.exhaustive,
)
