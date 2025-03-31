import * as Doi from 'doi-ts'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

const crossrefDoiPrefixes = ['2139'] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

export type CrossrefPreprintId = Extract<PreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export type IndeterminateCrossrefPreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export const isCrossrefPreprintId: {
  (id: PreprintId): id is CrossrefPreprintId
  (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId
} = (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId =>
  id.type !== 'philsci' && isCrossrefPreprintDoi(id.value)

const isCrossrefPreprintDoi = Doi.hasRegistrant(...crossrefDoiPrefixes)
