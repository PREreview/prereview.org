import * as Doi from 'doi-ts'
import type { IndeterminatePreprintId, PreprintId } from '../PreprintId.ts'

const crossrefDoiPrefixes = [
  '1101',
  '1590',
  '2139',
  '12688',
  '14293',
  '20944',
  '21203',
  '22541',
  '26434',
  '31124',
  '31219',
  '31222',
  '31223',
  '31234',
  '31235',
  '31730',
  '35542',
  '55458',
  '62329',
] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

export type CrossrefPreprintId = Extract<PreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export type IndeterminateCrossrefPreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }>

export const isCrossrefPreprintId = (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId =>
  id._tag !== 'PhilsciPreprintId' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...crossrefDoiPrefixes)
