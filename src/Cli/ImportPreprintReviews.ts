import { Command } from 'effect/cli'
import { Array, Console, Effect, Schema, SchemaTransformation, Stdio, Stream, Struct } from 'effect'
import { PreprintReviewImported, StructuredPrereviewSchema } from '../Events.ts'
import { Html, HtmlFromSelfSchema } from '../html.ts'
import { NameSchema } from '../types/Name.ts'
import * as OrcidId from '../types/OrcidId.ts'
import { PseudonymSchema } from '../types/Pseudonym.ts'

const NaiveHtmlSchema: Schema.Codec<Html, string> = Schema.String.pipe(
  Schema.decodeTo(
    HtmlFromSelfSchema,
    SchemaTransformation.transform({ decode: value => new Html({ value }), encode: String }),
  ),
)

const PrereviewToImportSchema = Schema.Struct({
  ...Struct.omit(PreprintReviewImported.fields, ['_tag']),
  authors: Schema.NonEmptyArray(
    Schema.TaggedUnion({
      PublicPersona: { name: NameSchema, orcidId: OrcidId.OrcidIdSchema },
      PseudonymPersona: { pseudonym: PseudonymSchema },
      Unknown: { name: NameSchema },
    }),
  ),
  content: Schema.TaggedUnion({
    Structured: StructuredPrereviewSchema.fields,
    FreeText: { text: NaiveHtmlSchema },
  }),
})

const program = Effect.fnUntraced(function* () {
  const stdio = yield* Stdio.Stdio

  const input = yield* Stream.mkString(Stream.decodeText(stdio.stdin))

  const items = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Array(PrereviewToImportSchema)))(input)

  yield* Console.log(`importing ${Array.length(items)} preprint reviews`)
})

export const ImportPreprintReviews = Command.make('import-preprint-reviews', {}, program)
