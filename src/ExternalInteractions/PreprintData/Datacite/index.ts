import { Effect, pipe } from 'effect'
import { Datacite } from '../../../ExternalApis/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import type * as LanguageDetection from '../../LanguageDetection/index.ts'
import { recordToPreprint } from './Preprint.ts'
import type { IndeterminateDatacitePreprintId } from './PreprintId.ts'

export { isDatacitePreprintId } from './PreprintId.ts'

export const getPreprintFromDatacite = (
  id: IndeterminateDatacitePreprintId,
): Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Datacite.Datacite | LanguageDetection.LanguageDetection
> =>
  pipe(
    Datacite.getRecord(id.value),
    Effect.andThen(recordToPreprint),
    Effect.catchTags({
      RecordIsNotFound: error => new Preprints.PreprintIsNotFound({ cause: error }),
      RecordIsUnavailable: error => new Preprints.PreprintIsUnavailable({ cause: error }),
    }),
  )
