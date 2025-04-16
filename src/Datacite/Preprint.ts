import { Either } from 'effect'
import * as Preprint from '../preprint.js'
import type { Record } from './Record.js'

export const recordToPreprint = (
  record: Record,
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    if (
      record.types.resourceType?.toLowerCase() !== 'preprint' &&
      record.types.resourceTypeGeneral?.toLowerCase() !== 'preprint'
    ) {
      yield* Either.left(new Preprint.NotAPreprint({ cause: record.types }))
    }

    return yield* Either.left(new Preprint.PreprintIsUnavailable({}))
  })
