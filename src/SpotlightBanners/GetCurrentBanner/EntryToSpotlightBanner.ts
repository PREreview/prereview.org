import { ParseResult, Schema, String } from 'effect'
import { ContentfulId, Entry } from '../../ExternalApis/Contentful/index.ts'
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
    title: Schema.String,
    text: Schema.String,
    callToAction: Schema.String,
    link: Schema.String,
    theme: Schema.Literal('Community', 'Product'),
  }),
})

export const EntryToSpotlightBanner = Schema.transformOrFail(Schema.typeSchema(SpotlightBannerEntry), SpotlightBanner, {
  strict: true,
  decode: entry =>
    ParseResult.succeed({
      id: entry.sys.id,
      title: entry.fields.title,
      description: entry.fields.text,
      callToAction: {
        text: entry.fields.callToAction,
        url: entry.fields.link,
      },
      theme: String.toLowerCase(entry.fields.theme),
    }),
  encode: (spotlightBanner, _, ast) =>
    ParseResult.fail(
      new ParseResult.Forbidden(ast, spotlightBanner, 'Encoding spotlight banners back to an entry is forbidden.'),
    ),
})
