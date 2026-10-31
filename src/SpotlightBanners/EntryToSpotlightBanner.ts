import { Effect, Option, Record, Schema, String, SchemaIssue, SchemaGetter } from 'effect'
import { Locale } from '../Context.ts'
import { ContentfulId, Entry } from '../ExternalApis/Contentful/index.ts'
import { languageAttributesFor } from '../Locales.ts'
import { SpotlightBanner } from './Types.ts'

const SpotlightBannerEntry = Schema.Struct({
  ...Entry.fields,
  sys: Schema.Struct({
    ...Entry.fields.sys.fields,
    contentType: Schema.Struct({
      ...Entry.fields.sys.fields.contentType.fields,
      sys: Schema.Struct({
        ...Entry.fields.sys.fields.contentType.fields.sys.fields,
        id: Schema.Literal(ContentfulId.make('banner')),
      }),
    }),
  }),
  fields: Schema.Struct({
    title: Schema.StructWithRest(Schema.Struct({ 'en-US': Schema.String }), [
      Schema.Record(Schema.NonEmptyString, Schema.String),
    ]),
    text: Schema.StructWithRest(Schema.Struct({ 'en-US': Schema.String }), [
      Schema.Record(Schema.NonEmptyString, Schema.String),
    ]),
    callToAction: Schema.StructWithRest(Schema.Struct({ 'en-US': Schema.String }), [
      Schema.Record(Schema.NonEmptyString, Schema.String),
    ]),
    link: Schema.Struct({ 'en-US': Schema.String }),
    theme: Schema.Struct({ 'en-US': Schema.Literals(['Community', 'Product']) }),
  }),
})

export const EntryToSpotlightBanner = Schema.toType(SpotlightBannerEntry).pipe(
  Schema.decodeTo(SpotlightBanner, {
    decode: SchemaGetter.transformEffect(entry =>
      Effect.gen(function* () {
        const locale = yield* Locale

        return {
          id: entry.sys.id,
          title: Option.match(Record.get(entry.fields.title, locale), {
            onSome: title => `<span>${title}</span>`,
            onNone: () => `<span ${languageAttributesFor('en-US').toString()}>${entry.fields.title['en-US']}</span>`,
          }),
          description: Option.match(Record.get(entry.fields.text, locale), {
            onSome: text => `<span>${text}</span>`,
            onNone: () => `<span ${languageAttributesFor('en-US').toString()}>${entry.fields.text['en-US']}</span>`,
          }),
          callToAction: {
            text: Option.match(Record.get(entry.fields.callToAction, locale), {
              onSome: callToAction => `<span>${callToAction}</span>`,
              onNone: () =>
                `<span ${languageAttributesFor('en-US').toString()}>${entry.fields.callToAction['en-US']}</span>`,
            }),
            url: entry.fields.link['en-US'],
          },
          theme: String.toLowerCase(entry.fields.theme['en-US']),
        }
      }),
    ),
    encode: SchemaGetter.transformEffect(spotlightBanner =>
      Effect.fail(
        new SchemaIssue.Forbidden(
          { message: 'Encoding spotlight banners back to an entry is forbidden.' },
          spotlightBanner,
        ),
      ),
    ),
  }),
)
