import { type Array, Context, Effect } from 'effect'
import type * as Preprint from './Preprint.ts'
import type { IndeterminatePreprintId, PreprintId } from './PreprintId.ts'

export * from './Preprint.ts'
export * from './PreprintId.ts'
export * from './PreprintServers.ts'

export class Preprints extends Context.Tag('Preprints')<
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
>() {}

export const getPreprint = (...args: Parameters<(typeof Preprints.Service)['getPreprint']>) =>
  Effect.flatMap(Preprints, service => service.getPreprint(...args))

export const getPreprintId = (...args: Parameters<(typeof Preprints.Service)['getPreprintId']>) =>
  Effect.flatMap(Preprints, service => service.getPreprintId(...args))

export const getPreprintTitle = (...args: Parameters<(typeof Preprints.Service)['getPreprintTitle']>) =>
  Effect.flatMap(Preprints, service => service.getPreprintTitle(...args))

export const resolvePreprintId = (...args: Parameters<(typeof Preprints.Service)['resolvePreprintId']>) =>
  Effect.flatMap(Preprints, service => service.resolvePreprintId(...args))
