import { Context, Effect, Either, flow, Layer } from 'effect'
import type * as EventStore from '../../EventStore.ts'
import * as Queries from '../../Queries.ts'
import * as GetSubscribedKeywords from './GetSubscribedKeywords.ts'

export class PrereviewerQueries extends Context.Tag('PrereviewerQueries')<
  PrereviewerQueries,
  {
    getSubscribedKeywords: Queries.Query<(input: GetSubscribedKeywords.Input) => GetSubscribedKeywords.Result>
  }
>() {}

export const { getSubscribedKeywords } = Effect.serviceFunctions(PrereviewerQueries)

const makePrereviewerQueries: Effect.Effect<typeof PrereviewerQueries.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    return {
      getSubscribedKeywords: yield* Queries.makeQuery(
        'PrereviewerQueries.getSubscribedKeywords',
        GetSubscribedKeywords.createFilter,
        flow(GetSubscribedKeywords.query, Either.right),
      ),
    }
  })

export const queriesLayer = Layer.effect(PrereviewerQueries, makePrereviewerQueries)
