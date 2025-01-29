import { Effect } from 'effect'
import * as Preprint from '../preprint.js'
import type { JapanLinkCenterPreprintId } from './PreprintId.js'

export { isJapanLinkCenterPreprintDoi, type JapanLinkCenterPreprintId } from './PreprintId.js'

export const getPreprintFromJapanLinkCenter: (
  id: JapanLinkCenterPreprintId,
) => Effect.Effect<Preprint.Preprint, Preprint.PreprintIsUnavailable> = () =>
  Effect.fail(new Preprint.PreprintIsUnavailable())
