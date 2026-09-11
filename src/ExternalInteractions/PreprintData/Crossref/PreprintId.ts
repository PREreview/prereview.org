import type { IndeterminatePreprintId, LifecycleJournalPreprintId, PreprintId } from '../../../Preprints/index.ts'
import { Doi } from '../../../types/index.ts'

const crossrefDoiPrefixes = [
  '1101',
  '1590',
  '2139',
  '2196',
  '12688',
  '14293',
  '20944',
  '21070',
  '21203',
  '22541',
  '26434',
  '31124',
  '31219',
  '31222',
  '31223',
  '31224',
  '31234',
  '31235',
  '31730',
  '32942',
  '35542',
  '36227',
  '55458',
  '62329',
  '64898',
  '71240',
] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

type CrossrefLifecycleJournalPreprintId = Omit<LifecycleJournalPreprintId, 'value'> & {
  value: Doi.Doi<'71240'>
}

export type CrossrefPreprintId =
  Extract<PreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }> | CrossrefLifecycleJournalPreprintId

export type IndeterminateCrossrefPreprintId =
  Extract<IndeterminatePreprintId, { value: Doi.Doi<CrossrefDoiPrefix> }> | CrossrefLifecycleJournalPreprintId

export const isCrossrefPreprintId = (id: IndeterminatePreprintId): id is IndeterminateCrossrefPreprintId =>
  id._tag !== 'PhilsciPreprintId' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...crossrefDoiPrefixes)
