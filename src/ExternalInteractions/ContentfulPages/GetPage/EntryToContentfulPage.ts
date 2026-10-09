import { Effect, flow, HashSet, Option, type ParseResult, pipe, Predicate, Record, Ref, Schema } from 'effect'
import { Locale } from '../../../Context.ts'
import { ContentfulId, Document, type Entry } from '../../../ExternalApis/Contentful/index.ts'
import { html } from '../../../html.ts'
import { DefaultLocale, type SupportedLocale } from '../../../locales/index.ts'
import type { DynamicEmbedder } from '../DynamicEmbedder.ts'
import { BlockContentToHtml, RequiredJs } from '../RichText.ts'
import { ContentfulPage } from '../Types.ts'

const PageEntry = Schema.Struct({
  sys: Schema.Struct({
    contentType: Schema.Struct({ sys: Schema.Struct({ id: Schema.Literal(ContentfulId.make('page')) }) }),
  }),
  fields: Schema.Struct({
    title: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    content: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Document }),
  }),
})

const PageEntryToContentfulPage = Effect.fnUntraced(
  function* (entry: typeof PageEntry.Type) {
    const locale = yield* Locale
    const requiredJs = yield* RequiredJs

    return new ContentfulPage({
      title: Option.match(getValueForLocale(entry.fields.title, locale), {
        onSome: title => html`${title}`,
        onNone: () => html`${getValueForDefaultLocale(entry.fields.title)}`,
      }),
      html: yield* Option.match(getValueForLocale(entry.fields.content, locale), {
        onSome: content => Effect.map(BlockContentToHtml(content), Option.getOrThrow),
        onNone: () => Effect.map(BlockContentToHtml(getValueForDefaultLocale(entry.fields.content)), Option.getOrThrow),
      }),
      locale: Option.match(getValueForLocale(entry.fields.title, locale), {
        onSome: () => locale,
        onNone: () => DefaultLocale,
      }),
      js: yield* Ref.get(requiredJs),
    })
  },
  Effect.provideServiceEffect(RequiredJs, Ref.make(HashSet.empty())),
)

export const EntryToContentfulPage: (
  entry: Entry,
) => Effect.Effect<ContentfulPage, ParseResult.ParseError, DynamicEmbedder | Locale> = flow(
  Schema.decodeUnknown(Schema.typeSchema(PageEntry)),
  Effect.andThen(PageEntryToContentfulPage),
)

const getValueForLocale = <T>(values: Record<string, T | undefined>, locale: SupportedLocale): Option.Option<T> =>
  pipe(Record.get(values, locale), Option.filter(Predicate.isNotUndefined))

const getValueForDefaultLocale = <T>(values: Record<string, T | undefined>): T =>
  pipe(
    Record.get(values, DefaultLocale),
    Option.filter(Predicate.isNotUndefined),
    Option.getOrThrowWith(() => 'No locale available for a value'),
  )
