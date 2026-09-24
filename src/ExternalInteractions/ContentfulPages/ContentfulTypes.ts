import { Schema } from 'effect'
import { Asset, ContentfulId, Document } from '../../ExternalApis/Contentful/index.ts'
import { SlugSchema } from '../../types/Slug.ts'
import { DynamicEmbed } from './DynamicEmbedder.ts'

export const PageEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('page')) }) }),
  }),
  fields: Schema.Struct({
    slug: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: SlugSchema }),
  }),
})

export const CallToActionEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('callToAction')) }) }),
  }),
  fields: Schema.Struct({
    text: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    url: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.URL }),
  }),
}).pipe(Schema.attachPropertySignature('_tag', 'CallToActionEntry'))

export const DynamicEmbedEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('dynamicEmbed')) }) }),
  }),
  fields: Schema.Struct({
    key: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: DynamicEmbed }),
  }),
}).pipe(Schema.attachPropertySignature('_tag', 'DynamicEmbedEntry'))

export const MediaEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('media')) }) }),
  }),
  fields: Schema.Struct({
    caption: Schema.optional(Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.typeSchema(Document) })),
    file: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.typeSchema(Asset) }),
    altText: Schema.optional(Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString })),
  }),
}).pipe(Schema.attachPropertySignature('_tag', 'MediaEntry'))

export const HeroImageEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('heroImage')) }) }),
  }),
  fields: Schema.Struct({
    caption: Schema.optional(Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.typeSchema(Document) })),
    image: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.typeSchema(Asset) }),
    altText: Schema.optional(Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString })),
  }),
}).pipe(Schema.attachPropertySignature('_tag', 'HeroImageEntry'))
