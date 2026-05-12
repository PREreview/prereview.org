import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Orcid } from '../../ExternalApis/index.ts'
import { GetName } from './GetName/index.ts'

export { NameIsNotAvailable } from './GetName/index.ts'

export class OrcidRecords extends Context.Tag('OrcidRecords')<
  OrcidRecords,
  {
    getName: (
      ...args: Parameters<typeof GetName>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetName>>,
      Effect.Effect.Error<ReturnType<typeof GetName>>
    >
  }
>() {}

export const { getName } = Effect.serviceFunctions(OrcidRecords)

const make: Effect.Effect<typeof OrcidRecords.Service, never, Orcid.Orcid> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<Orcid.Orcid>(), Context.omit(Scope.Scope))

  return {
    getName: flow(GetName, Effect.provide(context)),
  }
})

export const layer = Layer.effect(OrcidRecords, make)
