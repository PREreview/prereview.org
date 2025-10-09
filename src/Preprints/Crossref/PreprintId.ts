import * as Doi from 'doi-ts'
import type { IndeterminatePreprintId, PreprintId } from '../PreprintId.ts'

const crossrefDoiPrefixes = [
  '1101',
  '1590',
  '2139',
  '12688',
  '20944',
  '21203',
  '31219',
  '31222',
  '31234',
  '31235',
  '55458',
] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

export type CrossrefPreprintId = Extract<PreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export type IndeterminateCrossrefPreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export const isCrossrefPreprintId = (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId =>
  id._tag !== 'PhilsciPreprintId' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...crossrefDoiPrefixes)
