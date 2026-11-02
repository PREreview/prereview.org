import { type Array, Context, type Effect } from 'effect'
import type * as Preprint from './Preprint.ts'
import type { IndeterminatePreprintId, PreprintId } from './PreprintId.ts'

export * from './Preprint.ts'
export * from './PreprintId.ts'
export * from './PreprintServers.ts'

export class Preprints extends Context.Service<
  Preprints,
  {
    getPreprint: (
      id: IndeterminatePreprintId,
    ) => Effect.Effect<Preprint.Preprint, Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
    getPreprintId: (
      id: IndeterminatePreprintId,
    ) => Effect.Effect<PreprintId, Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
    getPreprintTitle: (
      id: IndeterminatePreprintId,
    ) => Effect.Effect<Preprint.PreprintTitle, Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
    resolvePreprintId: (
      ...ids: Array.NonEmptyReadonlyArray<IndeterminatePreprintId>
    ) => Effect.Effect<PreprintId, Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable>
  }
>()('Preprints') {}

export const getPreprint = (...args: Parameters<(typeof Preprints.Service)['getPreprint']>) =>
  Preprints.use(service => service.getPreprint(...args))

export const getPreprintId = (...args: Parameters<(typeof Preprints.Service)['getPreprintId']>) =>
  Preprints.use(service => service.getPreprintId(...args))

export const getPreprintTitle = (...args: Parameters<(typeof Preprints.Service)['getPreprintTitle']>) =>
  Preprints.use(service => service.getPreprintTitle(...args))

export const resolvePreprintId = (...args: Parameters<(typeof Preprints.Service)['resolvePreprintId']>) =>
  Preprints.use(service => service.resolvePreprintId(...args))
