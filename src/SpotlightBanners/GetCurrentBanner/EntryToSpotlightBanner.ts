import { Effect, Option, ParseResult, Record, Schema, String } from 'effect'
import { Locale } from '../../Context.ts'
import { ContentfulId, Entry } from '../../ExternalApis/Contentful/index.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { SpotlightBanner } from '../Types.ts'

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
    title: Schema.Struct(
      { 'en-US': Schema.String },
      Schema.Record({ key: Schema.NonEmptyString, value: Schema.String }),
    ),
    text: Schema.Struct(
      { 'en-US': Schema.String },
      Schema.Record({ key: Schema.NonEmptyString, value: Schema.String }),
    ),
    callToAction: Schema.Struct(
      { 'en-US': Schema.String },
      Schema.Record({ key: Schema.NonEmptyString, value: Schema.String }),
    ),
    link: Schema.Struct({ 'en-US': Schema.String }),
    theme: Schema.Struct({ 'en-US': Schema.Literal('Community', 'Product') }),
  }),
})

export const EntryToSpotlightBanner = Schema.transformOrFail(Schema.typeSchema(SpotlightBannerEntry), SpotlightBanner, {
  strict: true,
  decode: entry =>
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
  encode: (spotlightBanner, _, ast) =>
    ParseResult.fail(
      new ParseResult.Forbidden(ast, spotlightBanner, 'Encoding spotlight banners back to an entry is forbidden.'),
    ),
})
