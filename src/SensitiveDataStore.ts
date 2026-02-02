import { Array, Context, Data, Effect, type Option, pipe, Record, Request, RequestResolver, Struct } from 'effect'
import type { Uuid } from './types/index.ts'

export const SensitiveDataStore = Context.GenericTag<SensitiveDataStore>('SensitiveDataStore')

export class FailedToGetSensitiveData extends Data.TaggedError('FailedToGetSensitiveData')<{ cause?: unknown }> {}

export class FailedToAddSensitiveData extends Data.TaggedError('FailedToAddSensitiveData')<{ cause?: unknown }> {}

export interface SensitiveDataStore {
  readonly get: (id: Uuid.Uuid) => Effect.Effect<Option.Option<string>, FailedToGetSensitiveData>

  readonly getMany: (
    ids: Array.NonEmptyReadonlyArray<Uuid.Uuid>,
  ) => Effect.Effect<Record<Uuid.Uuid, string>, FailedToGetSensitiveData>

  readonly add: (value: string) => Effect.Effect<Uuid.Uuid, FailedToAddSensitiveData>
}

export const { add, getMany } = Effect.serviceFunctions(SensitiveDataStore)

export const get = (id: Uuid.Uuid) => Effect.request(new GetSensitiveData({ id }), GetSensitiveDataResolver)

class GetSensitiveData extends Request.TaggedClass('GetSensitiveData')<
  Option.Option<string>,
  FailedToGetSensitiveData,
  { readonly id: Uuid.Uuid }
> {}

const GetSensitiveDataResolver = RequestResolver.makeBatched(
  (requests: Array.NonEmptyReadonlyArray<GetSensitiveData>) =>
    pipe(
      Array.map(requests, Struct.get('id')),
      getMany,
      Effect.andThen(results =>
        Effect.forEach(requests, request =>
          Request.completeEffect(request, Effect.succeed(Record.get(results, request.id))),
        ),
      ),
      Effect.catchAll(error =>
        Effect.forEach(requests, request => Request.completeEffect(request, Effect.fail(error))),
      ),
    ),
).pipe(RequestResolver.contextFromServices(SensitiveDataStore))
