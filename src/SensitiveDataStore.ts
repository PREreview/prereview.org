import { Context, Data, Effect, type Option } from 'effect'
import type { Uuid } from './types/index.ts'

export const SensitiveDataStore = Context.GenericTag<SensitiveDataStore>('SensitiveDataStore')

export class FailedToGetSensitiveData extends Data.TaggedError('FailedToGetSensitiveData')<{ cause?: unknown }> {}

export class FailedToAddSensitiveData extends Data.TaggedError('FailedToAddSensitiveData')<{ cause?: unknown }> {}

export interface SensitiveDataStore {
  readonly get: (id: Uuid.Uuid) => Effect.Effect<Option.Option<string>, FailedToGetSensitiveData>

  readonly add: (value: string) => Effect.Effect<Uuid.Uuid, FailedToAddSensitiveData>
}

export const { get, add } = Effect.serviceFunctions(SensitiveDataStore)
