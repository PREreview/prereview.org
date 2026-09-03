import { Array, Match, Option, ParseResult, pipe, Predicate, Record, Schema } from 'effect'
import { ContentfulId, Document, type DocumentType, Entry, type Mark } from '../../../ExternalApis/Contentful/index.ts'
import { html, type Html } from '../../../html.ts'
import { DefaultLocale } from '../../../locales/index.ts'
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
    decode: entry =>
      ParseResult.succeed(
        new ContentfulPage({
          html: html`${Array.map(getValueForDefaultLocale(entry.fields.content).content, DocumentTypeToHtml)}`,
          locale: DefaultLocale,
        }),
      ),
    encode: (page, _, ast) =>
      ParseResult.fail(new ParseResult.Forbidden(ast, page, 'Encoding pages back to an entry is forbidden.')),
  },
)

const DocumentTypeToHtml: (documentType: DocumentType) => Html = Match.typeTags<DocumentType, Html>()({
  EmbeddedAssetBlock: embeddedAssetBlock => {
    const file = getValueForDefaultLocale(embeddedAssetBlock.data.target.fields.file)

    return html`<img
      src="${file.url.href}"
      width="${file.details.image.width}"
      height="${file.details.image.height}"
      alt=""
    />`
  },
  Heading1: heading1 => html`<h1>${Array.map(heading1.content, DocumentTypeToHtml)}</h1>`,
  Heading2: heading2 => html`<h2>${Array.map(heading2.content, DocumentTypeToHtml)}</h2> `,
  Heading3: heading3 => html`<h3>${Array.map(heading3.content, DocumentTypeToHtml)}</h3>`,
  Hyperlink: hyperlink => html`<a href="${hyperlink.data.uri}">${Array.map(hyperlink.content, DocumentTypeToHtml)}</a>`,
  Paragraph: paragraph => html`<p>${Array.map(paragraph.content, DocumentTypeToHtml)}</p>`,
  Text: text => Array.reduce(text.marks, html`${text.value}`, MarkToHtml),
})

const MarkToHtml: (text: Html, mark: Mark) => Html = (text, mark) =>
  Match.valueTags(mark, {
    Bold: () => html`<b>${text}</b>`,
    Italic: () => html`<i>${text}</i>`,
  })

const getValueForDefaultLocale = <T>(values: Record<string, T | undefined>): T =>
  pipe(
    Record.get(values, DefaultLocale),
    Option.filter(Predicate.isNotUndefined),
    Option.getOrThrowWith(() => 'No locale available for a value'),
  )
