import { it as effectIt } from '@effect/vitest'
import { Effect, Layer, type Scope } from 'effect'
import { TestClock, TestConsole } from 'effect/testing'
import * as fc from 'fast-check'
import type { TestContext } from 'vitest'

export { beforeEach, describe, expect, test, vi } from '@effect/vitest'

type Arbitraries = ReadonlyArray<fc.Arbitrary<unknown>> | Readonly<Record<string, fc.Arbitrary<unknown>>>

type Values<Arbs extends Arbitraries> = { [K in keyof Arbs]: Arbs[K] extends fc.Arbitrary<infer T> ? T : never }

type Options = number | { readonly timeout?: number; readonly fastCheck?: fc.Parameters<unknown> }

const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

type TestServices = Layer.Success<typeof TestEnv>

const toArbitraries = (arbitraries: Arbitraries): ReadonlyArray<fc.Arbitrary<unknown>> =>
  globalThis.Array.isArray(arbitraries)
    ? (arbitraries as ReadonlyArray<fc.Arbitrary<unknown>>)
    : [fc.record(arbitraries as Record<string, fc.Arbitrary<unknown>>)]

const toValues = <Arbs extends Arbitraries>(arbitraries: Arbs, values: ReadonlyArray<unknown>): Values<Arbs> =>
  (globalThis.Array.isArray(arbitraries) ? values : values[0]) as never

const timeoutFor = (options?: Options) => (typeof options === 'number' ? options : options?.timeout)

const parametersFor = (options?: Options) => (typeof options === 'number' ? undefined : options?.fastCheck)

const prop = <const Arbs extends Arbitraries>(
  name: string,
  arbitraries: Arbs,
  self: (properties: Values<Arbs>, ctx: TestContext) => boolean | undefined,
  options?: Options,
) =>
  effectIt(
    name,
    ctx =>
      fc.assert(
        fc.property(...(toArbitraries(arbitraries) as [fc.Arbitrary<unknown>]), (...values: ReadonlyArray<unknown>) =>
          self(toValues(arbitraries, values), ctx),
        ),
        parametersFor(options),
      ),
    timeoutFor(options),
  )

const effectProp = <const Arbs extends Arbitraries, A, E>(
  name: string,
  arbitraries: Arbs,
  self: (properties: Values<Arbs>, ctx: TestContext) => Effect.Effect<A, E, Scope.Scope | TestServices>,
  options?: Options,
) =>
  effectIt(
    name,
    ctx =>
      fc.assert(
        fc.asyncProperty(
          ...(toArbitraries(arbitraries) as [fc.Arbitrary<unknown>]),
          (...values: ReadonlyArray<unknown>) =>
            Effect.runPromise(
              Effect.suspend(() => self(toValues(arbitraries, values), ctx)).pipe(
                Effect.map(result => result !== false),
                Effect.scoped,
                Effect.provide(TestEnv),
              ),
            ),
        ),
        parametersFor(options),
      ),
    timeoutFor(options),
  )

type EffectMethods = { readonly prop: typeof effectProp } & typeof effectIt.effect

type Methods = { readonly prop: typeof prop; readonly effect: EffectMethods } & typeof effectIt

const effect: EffectMethods = new Proxy(effectIt.effect, {
  get: (target, property, receiver) =>
    property === 'prop' ? effectProp : (Reflect.get(target, property, receiver) as unknown),
}) as never

export const it: Methods = new Proxy(effectIt, {
  get: (target, property, receiver) => {
    if (property === 'prop') {
      return prop
    }

    if (property === 'effect') {
      return effect
    }

    return Reflect.get(target, property, receiver) as unknown
  },
}) as never
