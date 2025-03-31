import type { HttpClient } from '@effect/platform'
import type { Effect } from 'effect'
import * as Preprint from '../preprint.js'
import type { IndeterminateCrossrefPreprintId } from './PreprintId.js'

export { isCrossrefPreprintId } from './PreprintId.js'

export const getPreprintFromCrossref: (
  id: IndeterminateCrossrefPreprintId,
) => Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  HttpClient.HttpClient
> = () => new Preprint.PreprintIsUnavailable({})
