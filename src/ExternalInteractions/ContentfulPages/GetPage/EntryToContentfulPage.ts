import { Array, Match, Option, ParseResult, pipe, Predicate, Record, Schema } from 'effect'
import { ContentfulId, Document, type DocumentType, Entry, type Mark } from '../../../ExternalApis/Contentful/index.ts'
import { Html, html } from '../../../html.ts'
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
  EmbeddedEntryBlock: embeddedEntryBlock =>
    Schema.decodeUnknownSync(CallToActionEntryToHtml)(embeddedEntryBlock.data.target),
  Heading1: heading1 => html`<h1>${Array.map(heading1.content, DocumentTypeToHtml)}</h1>`,
  Heading2: heading2 => html`<h2>${Array.map(heading2.content, DocumentTypeToHtml)}</h2> `,
  Heading3: heading3 => html`<h3>${Array.map(heading3.content, DocumentTypeToHtml)}</h3>`,
  Hyperlink: hyperlink =>
    html`<a href="${hyperlink.data.uri.replace(/^https?:\/\/prereview\.org(?:\/|$)/, '/')}"
      >${Array.map(hyperlink.content, DocumentTypeToHtml)}</a
    >`,
  ListItem: listItem => html`<li>${ContentToHtmlSkippingOverSingleParagraph(listItem)}</li>`,
  Paragraph: paragraph => html`<p>${Array.map(paragraph.content, DocumentTypeToHtml)}</p>`,
  Table: table =>
    html`<table>
      ${Array.map(table.content, DocumentTypeToHtml)}
    </table>`,
  TableRow: tableRow =>
    html`<tr>
      ${Array.map(tableRow.content, DocumentTypeToHtml)}
    </tr>`,
  TableCell: tableCell => html`<td>${ContentToHtmlSkippingOverSingleParagraph(tableCell)}</td>`,
  TableHeaderCell: tableHeaderCell => html`<th>${ContentToHtmlSkippingOverSingleParagraph(tableHeaderCell)}</th>`,
  Text: text => Array.reduce(text.marks, html`${text.value}`, MarkToHtml),
  UnorderedList: unorderedList =>
    html`<ul>
      ${Array.map(unorderedList.content, DocumentTypeToHtml)}
    </ul>`,
})

const ContentToHtmlSkippingOverSingleParagraph = (
  documentType: Extract<DocumentType, { content: unknown }>,
): Array.NonEmptyReadonlyArray<Html> => {
  if (documentType.content.length === 1 && documentType.content[0]._tag === 'Paragraph') {
    return Array.map(documentType.content[0].content, DocumentTypeToHtml)
  }

  return Array.map(documentType.content, DocumentTypeToHtml)
}

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
