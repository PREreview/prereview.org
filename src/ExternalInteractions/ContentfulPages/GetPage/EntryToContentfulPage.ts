import { Array, Effect, Match, Option, ParseResult, pipe, Predicate, Record, Schema } from 'effect'
import { Locale } from '../../../Context.ts'
import { ContentfulId, Document, type DocumentType, Entry, type Mark } from '../../../ExternalApis/Contentful/index.ts'
import { Html, html } from '../../../html.ts'
import { DefaultLocale, type SupportedLocale } from '../../../locales/index.ts'
import { ContentfulPage } from '../Types.ts'

const ContentfulPageEntry = Schema.Struct({
  ...Entry.fields,
  sys: Schema.Struct({
    ...Entry.fields.sys.fields,
    contentType: Schema.Struct({
      ...Entry.fields.sys.fields.contentType.fields,
      sys: Schema.Struct({
        ...Entry.fields.sys.fields.contentType.fields.sys.fields,
        id: Schema.Literal(ContentfulId.make('page')),
      }),
    }),
  }),
  fields: Schema.Struct({
    title: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    content: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Document }),
  }),
})

export const EntryToContentfulPage = Schema.transformOrFail(
  Schema.typeSchema(ContentfulPageEntry),
  Schema.typeSchema(ContentfulPage),
  {
    strict: true,
    decode: Effect.fnUntraced(function* (entry) {
      const locale = yield* Locale

      return new ContentfulPage({
        title: Option.match(getValueForLocale(entry.fields.title, locale), {
          onSome: title => html`${title}`,
          onNone: () => html`${getValueForDefaultLocale(entry.fields.title)}`,
        }),
        html: Option.match(getValueForLocale(entry.fields.content, locale), {
          onSome: content => html`${Array.filterMap(content.content, DocumentTypeToHtml)}`,
          onNone: () =>
            html`${Array.filterMap(getValueForDefaultLocale(entry.fields.content).content, DocumentTypeToHtml)}`,
        }),
        locale: Option.match(getValueForLocale(entry.fields.title, locale), {
          onSome: () => locale,
          onNone: () => DefaultLocale,
        }),
      })
    }),
    encode: (page, _, ast) =>
      ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding pages back to an entry is forbidden.')),
  },
)

const HtmlFromSelfSchema = Schema.instanceOf(Html)

const CallToActionEntryToHtml = Schema.transformOrFail(
  Schema.Struct({
    sys: Schema.Struct({
      contentType: Schema.Struct({
        sys: Schema.Struct({
          id: Schema.Literal(ContentfulId.make('callToAction')),
        }),
      }),
    }),
    fields: Schema.Struct({
      text: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
      url: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.URL }),
    }),
  }),
  HtmlFromSelfSchema,
  {
    strict: true,
    decode: callToAction =>
      ParseResult.succeed(
        html`<a href="${getValueForDefaultLocale(callToAction.fields.url).href}" class="button"
          >${getValueForDefaultLocale(callToAction.fields.text)}</a
        >`,
      ),
    encode: (page, _, ast) =>
      ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding back to an embedded entry is forbidden.')),
  },
)

const DynamicEmbedEntryToHtml = Schema.transformOrFail(
  Schema.Struct({
    sys: Schema.Struct({
      contentType: Schema.Struct({
        sys: Schema.Struct({
          id: Schema.Literal(ContentfulId.make('dynamicEmbed')),
        }),
      }),
    }),
    fields: Schema.Struct({
      key: Schema.Record({ key: Schema.NonEmptyTrimmedString, value: Schema.NonEmptyTrimmedString }),
    }),
  }),
  HtmlFromSelfSchema,
  {
    strict: true,
    decode: dynamicEmbed => ParseResult.succeed(html`{{${getValueForDefaultLocale(dynamicEmbed.fields.key)}}}`),
    encode: (page, _, ast) =>
      ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding back to an embedded entry is forbidden.')),
  },
)

const EmbeddedEntryToHtml = Schema.Union(CallToActionEntryToHtml, DynamicEmbedEntryToHtml)

const DocumentTypeToHtml: (documentType: DocumentType) => Option.Option<Html> = Match.typeTags<
  DocumentType,
  Option.Option<Html>
>()({
  EmbeddedAssetBlock: embeddedAssetBlock => {
    const file = getValueForDefaultLocale(embeddedAssetBlock.data.target.fields.file)

    return Option.some(
      html`<img
        src="${file.url.href}"
        width="${file.details.image.width}"
        height="${file.details.image.height}"
        alt=""
      />`,
    )
  },
  EmbeddedEntryBlock: embeddedEntryBlock =>
    Option.fromNullable(Schema.decodeUnknownSync(EmbeddedEntryToHtml)(embeddedEntryBlock.data.target)),
  Heading1: heading1 => Option.some(html`<h1>${Array.filterMap(heading1.content, DocumentTypeToHtml)}</h1>`),
  Heading2: heading2 => Option.some(html`<h2>${Array.filterMap(heading2.content, DocumentTypeToHtml)}</h2> `),
  Heading3: heading3 => Option.some(html`<h3>${Array.filterMap(heading3.content, DocumentTypeToHtml)}</h3>`),
  Hyperlink: hyperlink =>
    Option.some(
      html`<a href="${hyperlink.data.uri.replace(/^https?:\/\/prereview\.org(?:\/|$)/, '/')}"
        >${Array.filterMap(hyperlink.content, DocumentTypeToHtml)}</a
      >`,
    ),
  ListItem: listItem => Option.some(html`<li>${ContentToHtmlSkippingOverSingleParagraph(listItem)}</li>`),
  Paragraph: paragraph =>
    Array.match(Array.filterMap(paragraph.content, DocumentTypeToHtml), {
      onEmpty: () => Option.none(),
      onNonEmpty: content => Option.some(html`<p>${content}</p>`),
    }),
  Table: table =>
    Option.some(
      html`<table>
        ${Array.filterMap(table.content, DocumentTypeToHtml)}
      </table>`,
    ),
  TableRow: tableRow =>
    Option.some(
      html`<tr>
        ${Array.filterMap(tableRow.content, DocumentTypeToHtml)}
      </tr>`,
    ),
  TableCell: tableCell => Option.some(html`<td>${ContentToHtmlSkippingOverSingleParagraph(tableCell)}</td>`),
  TableHeaderCell: tableHeaderCell =>
    Option.some(html`<th>${ContentToHtmlSkippingOverSingleParagraph(tableHeaderCell)}</th>`),
  Text: text =>
    text.value === '' ? Option.none() : Option.some(Array.reduce(text.marks, html`${text.value}`, MarkToHtml)),
  UnorderedList: unorderedList =>
    Option.some(
      html`<ul>
        ${Array.filterMap(unorderedList.content, DocumentTypeToHtml)}
      </ul>`,
    ),
})

const ContentToHtmlSkippingOverSingleParagraph = (
  documentType: Extract<DocumentType, { content: unknown }>,
): ReadonlyArray<Html> => {
  if (documentType.content.length === 1 && documentType.content[0]._tag === 'Paragraph') {
    return Array.filterMap(documentType.content[0].content, DocumentTypeToHtml)
  }

  return Array.filterMap(documentType.content, DocumentTypeToHtml)
}

const MarkToHtml: (text: Html, mark: Mark) => Html = (text, mark) =>
  Match.valueTags(mark, {
    Bold: () => html`<b>${text}</b>`,
    Italic: () => html`<i>${text}</i>`,
  })

const getValueForLocale = <T>(values: Record<string, T | undefined>, locale: SupportedLocale): Option.Option<T> =>
  pipe(Record.get(values, locale), Option.filter(Predicate.isNotUndefined))

const getValueForDefaultLocale = <T>(values: Record<string, T | undefined>): T =>
  pipe(
    Record.get(values, DefaultLocale),
    Option.filter(Predicate.isNotUndefined),
    Option.getOrThrowWith(() => 'No locale available for a value'),
  )
