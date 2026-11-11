import { describe, expect, it, vi } from '../../vitest.ts'
import { Effect, Layer, Schema } from 'effect'
import * as _ from '../../../src/ExternalApis/Contentful/Links.ts'
import {
  AssetLink,
  Assets,
  Contentful,
  ContentfulId,
  ContentfulIsUnavailable,
  Entries,
  EntryLink,
  ImageAsset,
} from '../../../src/ExternalApis/Contentful/index.ts'

describe('LinkedEntry', () => {
  it.effect('looks it up', () =>
    Effect.gen(function* () {
      const getEntries = vi.fn<typeof Contentful.Service.getEntries>(() =>
        Effect.succeed(
          Schema.decodeUnknownSync(Entries)({
            total: 1,
            items: [rawEntry('an-entry', { slug: { 'en-US': 'a-slug' } })],
          }),
        ),
      )

      const actual = yield* Schema.decodeUnknownEffect(_.LinkedEntry(SlugEntry))(entryLink('an-entry')).pipe(
        Effect.provide(Layer.mock(Contentful, { getEntries })),
      )

      expect(actual).toStrictEqual({ fields: { slug: { 'en-US': 'a-slug' } } })
      expect(getEntries).toHaveBeenCalledWith({ 'sys.id': 'an-entry', limit: 1 })
    }),
  )

  it.effect("when it can't be found", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(Schema.decodeUnknownEffect(_.LinkedEntry(SlugEntry))(entryLink('an-entry')))

      expect(actual._tag).toStrictEqual('SchemaError')
    }).pipe(
      Effect.provide(
        Layer.mock(Contentful, {
          getEntries: () => Effect.succeed(Schema.decodeUnknownSync(Entries)({ total: 0, items: [] })),
        }),
      ),
    ),
  )

  it.effect("when Contentful isn't available", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(Schema.decodeUnknownEffect(_.LinkedEntry(SlugEntry))(entryLink('an-entry')))

      expect(actual._tag).toStrictEqual('SchemaError')
    }).pipe(Effect.provide(Layer.mock(Contentful, { getEntries: () => new ContentfulIsUnavailable({}) }))),
  )
})

describe('LinkedAsset', () => {
  it.effect('looks it up', () =>
    Effect.gen(function* () {
      const getAssets = vi.fn<typeof Contentful.Service.getAssets>(() =>
        Effect.succeed(Schema.decodeUnknownSync(Assets)({ total: 1, items: [rawAsset('an-asset')] })),
      )

      const actual = yield* Schema.decodeUnknownEffect(_.LinkedAsset(Schema.toType(ImageAsset)))(
        assetLink('an-asset'),
      ).pipe(Effect.provide(Layer.mock(Contentful, { getAssets })))

      expect(actual).toBeInstanceOf(ImageAsset)
      expect(actual.sys.id).toStrictEqual('an-asset')
      expect(getAssets).toHaveBeenCalledWith({ 'sys.id': 'an-asset', limit: 1 })
    }),
  )

  it.effect("when it can't be found", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(
        Schema.decodeUnknownEffect(_.LinkedAsset(Schema.toType(ImageAsset)))(assetLink('an-asset')),
      )

      expect(actual._tag).toStrictEqual('SchemaError')
    }).pipe(
      Effect.provide(
        Layer.mock(Contentful, {
          getAssets: () => Effect.succeed(Schema.decodeUnknownSync(Assets)({ total: 0, items: [] })),
        }),
      ),
    ),
  )

  it.effect("when Contentful isn't available", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(
        Schema.decodeUnknownEffect(_.LinkedAsset(Schema.toType(ImageAsset)))(assetLink('an-asset')),
      )

      expect(actual._tag).toStrictEqual('SchemaError')
    }).pipe(Effect.provide(Layer.mock(Contentful, { getAssets: () => new ContentfulIsUnavailable({}) }))),
  )
})

const entryLink = (id: string) => new EntryLink({ sys: { id: ContentfulId.make(id), type: 'Link', linkType: 'Entry' } })

const assetLink = (id: string) => new AssetLink({ sys: { id: ContentfulId.make(id), type: 'Link', linkType: 'Asset' } })

const rawEntry = (id: string, fields: Record<string, unknown>) => ({
  sys: {
    id,
    contentType: { sys: { type: 'Link', linkType: 'ContentType', id: 'page' } },
    createdAt: '2026-11-09T12:00:00Z',
  },
  fields,
})

const rawAsset = (id: string) => ({
  sys: { id, type: 'Asset' },
  fields: {
    title: { 'en-US': 'An image' },
    file: {
      'en-US': {
        url: `//images.ctfassets.net/space/${id}/image.png`,
        details: { image: { width: 960, height: 540 } },
        contentType: 'image/png',
      },
    },
  },
})

const SlugEntry = Schema.Struct({ fields: Schema.Struct({ slug: Schema.Record(Schema.String, Schema.String) }) })
