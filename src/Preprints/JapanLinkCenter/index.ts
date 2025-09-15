import { Effect, pipe } from 'effect'
import { JapanLinkCenter } from '../../ExternalApis/index.js'
import * as Preprint from '../../preprint.js'
import { recordToPreprint } from './Preprint.js'
import type { JapanLinkCenterPreprintId } from './PreprintId.js'

export { isJapanLinkCenterPreprintId, type JapanLinkCenterPreprintId } from './PreprintId.js'

export const getPreprintFromJapanLinkCenter: (
  id: JapanLinkCenterPreprintId,
) => Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  JapanLinkCenter.JapanLinkCenter
> = id =>
  pipe(
    JapanLinkCenter.getRecord(id.value),
    Effect.andThen(recordToPreprint),
    Effect.catchTags({
      RecordIsNotFound: error => new Preprint.PreprintIsNotFound({ cause: error }),
      RecordIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
    }),
  )
