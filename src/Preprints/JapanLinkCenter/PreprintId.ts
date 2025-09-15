import * as Doi from 'doi-ts'
import type { IndeterminatePreprintId, PreprintId } from '../../types/preprint-id.js'

const japanLinkCenterDoiPrefixes = ['51094'] as const

type JapanLinkCenterDoiPrefix = (typeof japanLinkCenterDoiPrefixes)[number]

export type JapanLinkCenterPreprintId = Extract<PreprintId, { value: Doi.Doi<JapanLinkCenterDoiPrefix> }>

export const isJapanLinkCenterPreprintId = (id: IndeterminatePreprintId): id is JapanLinkCenterPreprintId =>
  id._tag !== 'PhilsciPreprintId' && isDoiFromSupportedPublisher(id.value)

export const isDoiFromSupportedPublisher = Doi.hasRegistrant(...japanLinkCenterDoiPrefixes)
