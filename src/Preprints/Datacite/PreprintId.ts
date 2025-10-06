import * as Doi from 'doi-ts'
import type { IndeterminatePreprintId, PreprintId } from '../PreprintId.ts'

const dataciteDoiPrefixes = ['5281', '6084', '17605', '48550', '60763'] as const

type DataciteDoiPrefix = (typeof dataciteDoiPrefixes)[number]

export type DatacitePreprintId = Extract<PreprintId, { value: Doi.Doi<DataciteDoiPrefix> }>

export type IndeterminateDatacitePreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<DataciteDoiPrefix> }>

export const isDatacitePreprintId = (id: IndeterminatePreprintId): id is IndeterminateDatacitePreprintId =>
  id._tag !== 'PhilsciPreprintId' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...dataciteDoiPrefixes)
