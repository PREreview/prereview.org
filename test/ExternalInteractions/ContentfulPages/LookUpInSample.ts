import { NodeFileSystem } from '@effect/platform-node'
import { UrlParams } from 'effect/http'
import { Array, Effect, FileSystem, Layer, Option, Schema } from 'effect'
import { Assets, Contentful, ContentfulIsUnavailable, Entries } from '../../../src/ExternalApis/Contentful/index.ts'

const Response = Schema.Struct({
  items: Schema.Array(Schema.Unknown),
  includes: Schema.optionalKey(
    Schema.Struct({
      Entry: Schema.optionalKey(Schema.Array(Schema.Unknown)),
      Asset: Schema.optionalKey(Schema.Array(Schema.Unknown)),
    }),
  ),
})

const HasId = Schema.Struct({ sys: Schema.Struct({ id: Schema.String }) })

const findById = (candidates: ReadonlyArray<unknown>, params: UrlParams.Input = {}) =>
  Option.match(UrlParams.getFirst(UrlParams.fromInput(params), 'sys.id'), {
    onNone: Array.empty,
    onSome: id => Array.filter(candidates, candidate => Schema.is(HasId)(candidate) && candidate.sys.id === id),
  })

export const LookUpInSample = (sample: string): Layer.Layer<Contentful> =>
  Layer.effect(
    Contentful,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const response = yield* Effect.andThen(
        fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${sample}.json`),
        Schema.decodeUnknownEffect(Schema.fromJsonString(Response)),
      )

      return {
        getEntries: (params?: UrlParams.Input) => {
          const items = findById([...response.items, ...(response.includes?.Entry ?? [])], params)

          return Effect.mapError(
            Schema.decodeUnknownEffect(Entries)({ total: items.length, items }),
            cause => new ContentfulIsUnavailable({ cause }),
          )
        },
        getAssets: (params?: UrlParams.Input) => {
          const items = findById(response.includes?.Asset ?? [], params)

          return Effect.mapError(
            Schema.decodeUnknownEffect(Assets)({ total: items.length, items }),
            cause => new ContentfulIsUnavailable({ cause }),
          )
        },
      }
    }).pipe(Effect.orDie),
  ).pipe(Layer.provide(NodeFileSystem.layer))
