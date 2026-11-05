import { Effect, Layer } from 'effect'
import { KeyValueStore } from 'effect/persistence'

const unavailable = (method: string) =>
  Effect.fail(new KeyValueStore.KeyValueStoreError({ message: 'unavailable', method }))

export const keyValueStoreWith = (
  overrides: Partial<Pick<Parameters<typeof KeyValueStore.makeStringOnly>[0], 'get' | 'set'>>,
) =>
  Layer.succeed(
    KeyValueStore.KeyValueStore,
    KeyValueStore.makeStringOnly({
      get: () => unavailable('get'),
      set: () => unavailable('set'),
      remove: () => unavailable('remove'),
      clear: unavailable('clear'),
      size: unavailable('size'),
      keys: unavailable('keys'),
      ...overrides,
    }),
  )
