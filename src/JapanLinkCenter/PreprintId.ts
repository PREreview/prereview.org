import * as Doi from 'doi-ts'
import type { PreprintId } from '../types/preprint-id.js'

const japanLinkCenterDoiPrefixes = ['51094'] as const

type JapanLinkCenterDoiPrefix = (typeof japanLinkCenterDoiPrefixes)[number]

export type JapanLinkCenterPreprintId = Extract<PreprintId, { value: Doi.Doi<JapanLinkCenterDoiPrefix> }>

export const isJapanLinkCenterPreprintDoi = Doi.hasRegistrant(...japanLinkCenterDoiPrefixes)
