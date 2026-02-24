import { Effect, pipe } from 'effect'
import { JapanLinkCenter } from '../../../ExternalApis/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import { recordToPreprint } from './Preprint.ts'
import type { JapanLinkCenterPreprintId } from './PreprintId.ts'

export { isJapanLinkCenterPreprintId, type JapanLinkCenterPreprintId } from './PreprintId.ts'

export const getPreprintFromJapanLinkCenter: (
  id: JapanLinkCenterPreprintId,
) => Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  JapanLinkCenter.JapanLinkCenter
> = id =>
  pipe(
    JapanLinkCenter.getRecord(id.value),
    Effect.andThen(recordToPreprint),
    Effect.catchTags({
      RecordIsNotFound: error => new Preprints.PreprintIsNotFound({ cause: error }),
      RecordIsUnavailable: error => new Preprints.PreprintIsUnavailable({ cause: error }),
    }),
  )
