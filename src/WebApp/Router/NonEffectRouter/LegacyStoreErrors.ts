import { Effect, flow } from 'effect'

interface StoreError {
  readonly _tag: `${string}NotFound` | `${string}Unavailable`
}

export const withLegacyReadErrors = <Args extends ReadonlyArray<unknown>, A, E extends StoreError, R>(
  read: (...args: Args) => Effect.Effect<A, E, R>,
) =>
  flow(
    read,
    Effect.mapError(error => (error._tag.endsWith('NotFound') ? ('not-found' as const) : ('unavailable' as const))),
  )

export const withLegacyWriteErrors = <Args extends ReadonlyArray<unknown>, A, E, R>(
  write: (...args: Args) => Effect.Effect<A, E, R>,
) =>
  flow(
    write,
    Effect.mapError(() => 'unavailable' as const),
  )
