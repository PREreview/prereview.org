import { Effect, pipe } from 'effect'
import { JapanLinkCenter } from '../../ExternalApis/index.ts'
import * as Preprint from '../Preprint.ts'
import { recordToPreprint } from './Preprint.ts'
import type { JapanLinkCenterPreprintId } from './PreprintId.ts'

export { isJapanLinkCenterPreprintId, type JapanLinkCenterPreprintId } from './PreprintId.ts'

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
