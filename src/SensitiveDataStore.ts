import { Array, Context, Data, Effect, type Option, pipe, Record, Request, RequestResolver } from 'effect'
import type { Uuid } from './types/index.ts'

export const SensitiveDataStore = Context.Service<SensitiveDataStore>('SensitiveDataStore')

export class FailedToGetSensitiveData extends Data.TaggedError('FailedToGetSensitiveData')<{ cause?: unknown }> {}

export class FailedToAddSensitiveData extends Data.TaggedError('FailedToAddSensitiveData')<{ cause?: unknown }> {}

export interface SensitiveDataStore {
  readonly get: (id: Uuid.Uuid) => Effect.Effect<Option.Option<string>, FailedToGetSensitiveData>

  readonly getMany: (
    ids: Array.NonEmptyReadonlyArray<Uuid.Uuid>,
  ) => Effect.Effect<Record<Uuid.Uuid, string>, FailedToGetSensitiveData>

  readonly add: (value: string) => Effect.Effect<Uuid.Uuid, FailedToAddSensitiveData>
}

export const add = (...args: Parameters<(typeof SensitiveDataStore.Service)['add']>) =>
  SensitiveDataStore.use(service => service.add(...args))

export const getMany = (...args: Parameters<(typeof SensitiveDataStore.Service)['getMany']>) =>
  SensitiveDataStore.use(service => service.getMany(...args))

export const get = (id: Uuid.Uuid) => Effect.request(new GetSensitiveData({ id }), GetSensitiveDataResolver)

class GetSensitiveData extends Request.TaggedClass('GetSensitiveData')<
  { readonly id: Uuid.Uuid },
  Option.Option<string>,
  FailedToGetSensitiveData,
  SensitiveDataStore
> {}

const GetSensitiveDataResolver = RequestResolver.make<GetSensitiveData>(entries =>
  pipe(
    Array.map(entries, entry => entry.request.id),
    getMany,
    Effect.andThen(results =>
      Effect.forEach(entries, entry => Request.succeed(entry, Record.get(results, entry.request.id)), {
        discard: true,
      }),
    ),
    Effect.catch(error => Effect.forEach(entries, entry => Request.fail(entry, error), { discard: true })),
    Effect.provideContext(Array.headNonEmpty(entries).context),
  ),
).pipe(RequestResolver.grouped(entry => Context.get(entry.context, SensitiveDataStore)))
