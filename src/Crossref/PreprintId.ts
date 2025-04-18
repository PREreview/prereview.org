import * as Doi from 'doi-ts'
import { Match, pipe } from 'effect'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

const crossrefDoiPrefixes = ['1101', '2139', '55458'] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

export type CrossrefPreprintId = Extract<PreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export type IndeterminateCrossrefPreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export const isCrossrefPreprintId = (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId =>
  id.type !== 'philsci' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...crossrefDoiPrefixes)

export const fromCrossrefPreprintDoi = pipe(
  Match.type<Doi.Doi<CrossrefDoiPrefix>>(),
  Match.withReturnType<IndeterminateCrossrefPreprintId>(),
  Match.when(Doi.hasRegistrant('1101'), value => ({ type: 'biorxiv-medrxiv', value })),
  Match.when(Doi.hasRegistrant('2139'), value => ({ type: 'ssrn', value })),
  Match.when(Doi.hasRegistrant('55458'), value => ({ type: 'neurolibre', value })),
  Match.exhaustive,
)
