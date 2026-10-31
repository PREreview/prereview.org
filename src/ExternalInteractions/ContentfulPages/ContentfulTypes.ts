import { Schema, SchemaTransformation } from 'effect'
import { ContentfulId, Document, ImageAsset, VideoAsset } from '../../ExternalApis/Contentful/index.ts'
import { SlugSchema } from '../../types/Slug.ts'
import { DynamicEmbed } from './DynamicEmbedder.ts'

export const PageEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('page')) }) }),
  }),
  fields: Schema.Struct({
    slug: Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), SlugSchema),
  }),
})

export const CallToActionEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('callToAction')) }) }),
  }),
  fields: Schema.Struct({
    text: Schema.Record(
      Schema.Trimmed.check(Schema.isNonEmpty()),
      Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    ),
    url: Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), Schema.URLFromString),
  }),
}).mapFields(fields => ({ ...fields, _tag: Schema.tagDefaultOmit('CallToActionEntry') }))

export const DynamicEmbedEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('dynamicEmbed')) }) }),
  }),
  fields: Schema.Struct({
    key: Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), DynamicEmbed),
  }),
}).mapFields(fields => ({ ...fields, _tag: Schema.tagDefaultOmit('DynamicEmbedEntry') }))

export const MediaEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('media')) }) }),
  }),
  fields: Schema.Struct({
    caption: Schema.optional(Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), Schema.toType(Document))),
    file: Schema.Record(
      Schema.Trimmed.check(Schema.isNonEmpty()),
      Schema.toType(Schema.Union([ImageAsset, VideoAsset])),
    ),
    altText: Schema.optional(
      Schema.Record(
        Schema.Trimmed.check(Schema.isNonEmpty()),
        Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      ),
    ),
  }),
}).mapFields(fields => ({ ...fields, _tag: Schema.tagDefaultOmit('MediaEntry') }))

export const MediaGalleryEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('mediaGallery')) }) }),
  }),
  fields: Schema.Struct({
    items: Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), Schema.NonEmptyArray(MediaEntry)),
  }),
}).mapFields(fields => ({ ...fields, _tag: Schema.tagDefaultOmit('MediaGalleryEntry') }))

export const HeroImageEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('heroImage')) }) }),
  }),
  fields: Schema.Struct({
    caption: Schema.optional(Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), Schema.toType(Document))),
    image: Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), Schema.toType(ImageAsset)),
    altText: Schema.optional(
      Schema.Record(
        Schema.Trimmed.check(Schema.isNonEmpty()),
        Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
      ),
    ),
  }),
}).mapFields(fields => ({ ...fields, _tag: Schema.tagDefaultOmit('HeroImageEntry') }))

export const YouTubeEntry = Schema.Struct({
  sys: Schema.Struct({
    id: ContentfulId,
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('youTube')) }) }),
  }),
  fields: Schema.Struct({
    title: Schema.Record(
      Schema.Trimmed.check(Schema.isNonEmpty()),
      Schema.String.pipe(Schema.decodeTo(Schema.NonEmptyString, SchemaTransformation.trim())),
    ),
    url: Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), Schema.URLFromString),
    caption: Schema.optional(Schema.Record(Schema.Trimmed.check(Schema.isNonEmpty()), Schema.toType(Document))),
  }),
}).mapFields(fields => ({ ...fields, _tag: Schema.tagDefaultOmit('YouTubeEntry') }))
