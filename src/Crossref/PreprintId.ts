import * as Doi from 'doi-ts'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

const crossrefDoiPrefixes = ['1101', '1590', '2139', '12688', '20944', '55458'] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

export type CrossrefPreprintId = Extract<PreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export type IndeterminateCrossrefPreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export const isCrossrefPreprintId = (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId =>
  id._tag !== 'philsci' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...crossrefDoiPrefixes)
