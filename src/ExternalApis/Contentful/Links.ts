import { Array, Context, Effect, Option, Schema, SchemaGetter, SchemaIssue } from 'effect'
import { Contentful } from './Contentful.ts'
import { AssetLink, Entries, EntryLink } from './Types.ts'

export const LinkContext = Context.Reference<Entries>('ContentfulLinkContext', {
  defaultValue: () => new Entries({ total: 0, items: [], includes: { Entry: [], Asset: [] } }),
})

export const LinkedEntry = <S extends Schema.Top>(schema: S) =>
  Schema.toType(EntryLink).pipe(
    Schema.decodeTo(schema, {
      decode: SchemaGetter.transformEffect(
        Effect.fnUntraced(function* (link) {
          const context = yield* LinkContext
          const included = Array.findFirst(
            Array.appendAll(context.items, context.includes.Entry),
            entry => entry.sys.id === link.sys.id,
          )

          if (Option.isSome(included)) {
            return included.value
          }

          const contentful = yield* Contentful
          const entries = yield* Effect.mapError(
            contentful.getEntries({ 'sys.id': link.sys.id, limit: 1 }),
            () => new SchemaIssue.InvalidValue({ message: 'Unable to look up entry link' }, link),
          )

          if (!Array.isReadonlyArrayNonEmpty(entries.items)) {
            return yield* Effect.fail(new SchemaIssue.InvalidValue({ message: 'Unresolvable entry link' }, link))
          }

          return entries.items[0]
        }),
      ),
      encode: SchemaGetter.forbidden(() => 'Encoding links is not supported'),
    }),
  )

export const LinkedAsset = <S extends Schema.Top>(schema: S) =>
  Schema.toType(AssetLink).pipe(
    Schema.decodeTo(schema, {
      decode: SchemaGetter.transformEffect(
        Effect.fnUntraced(function* (link) {
          const context = yield* LinkContext
          const included = Array.findFirst(context.includes.Asset, asset => asset.sys.id === link.sys.id)

          if (Option.isSome(included)) {
            return included.value
          }

          const contentful = yield* Contentful
          const assets = yield* Effect.mapError(
            contentful.getAssets({ 'sys.id': link.sys.id, limit: 1 }),
            () => new SchemaIssue.InvalidValue({ message: 'Unable to look up asset link' }, link),
          )

          if (!Array.isReadonlyArrayNonEmpty(assets.items)) {
            return yield* Effect.fail(new SchemaIssue.InvalidValue({ message: 'Unresolvable asset link' }, link))
          }

          return assets.items[0]
        }),
      ),
      encode: SchemaGetter.forbidden(() => 'Encoding links is not supported'),
    }),
  )
