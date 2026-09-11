import type { IndeterminatePreprintId, LifecycleJournalPreprintId, PreprintId } from '../../../Preprints/index.ts'
import { Doi } from '../../../types/index.ts'

const dataciteDoiPrefixes = ['5281', '6084', '17605', '23668', '48550', '57844', '60763', '82153'] as const

type DataciteDoiPrefix = (typeof dataciteDoiPrefixes)[number]

type DataciteLifecycleJournalPreprintId = Omit<LifecycleJournalPreprintId, 'value'> & {
  value: Doi.Doi<'17605'>
}

export type DatacitePreprintId =
  Extract<PreprintId, { value: Doi.Doi<DataciteDoiPrefix> }> | DataciteLifecycleJournalPreprintId

export type IndeterminateDatacitePreprintId =
  Extract<IndeterminatePreprintId, { value: Doi.Doi<DataciteDoiPrefix> }> | DataciteLifecycleJournalPreprintId

export const isDatacitePreprintId = (id: IndeterminatePreprintId): id is IndeterminateDatacitePreprintId =>
  id._tag !== 'PhilsciPreprintId' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...dataciteDoiPrefixes)
