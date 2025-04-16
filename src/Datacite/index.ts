import type { HttpClient } from '@effect/platform'
import type { Effect } from 'effect'
import * as Preprint from '../preprint.js'
import type { IndeterminateDatacitePreprintId } from './PreprintId.js'

export { isDatacitePreprintId } from './PreprintId.js'

export const getPreprintFromDatacite: (
  id: IndeterminateDatacitePreprintId,
) => Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  HttpClient.HttpClient
> = () => new Preprint.PreprintIsUnavailable({})
