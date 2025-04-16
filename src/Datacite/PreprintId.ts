import * as Doi from 'doi-ts'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'

const dataciteDoiPrefixes = ['17605'] as const

type DataciteDoiPrefix = (typeof dataciteDoiPrefixes)[number]

export type DatacitePreprintId = Extract<PreprintId, { value: Doi.Doi<DataciteDoiPrefix> }>

export type IndeterminateDatacitePreprintId = Extract<IndeterminatePreprintId, { value: Doi.Doi<DataciteDoiPrefix> }>

export const isDatacitePreprintId = (id: IndeterminatePreprintId): id is IndeterminateDatacitePreprintId =>
  id.type !== 'philsci' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...dataciteDoiPrefixes)
