import type { HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import * as Preprint from '../preprint.js'
import { workToPreprint } from './Preprint.js'
import type { IndeterminateCrossrefPreprintId } from './PreprintId.js'
import { getWork } from './Work.js'

export { isCrossrefPreprintId } from './PreprintId.js'

export const getPreprintFromCrossref = (
  id: IndeterminateCrossrefPreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  HttpClient.HttpClient
> =>
  pipe(
    getWork(id.value),
    Effect.andThen(workToPreprint),
    Effect.catchTags({
      WorkIsNotFound: error => new Preprint.PreprintIsNotFound({ cause: error }),
      WorkIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
    }),
  )
