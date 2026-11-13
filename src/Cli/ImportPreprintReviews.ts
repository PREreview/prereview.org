import { Command } from 'effect/cli'
import {
  Array,
  Console,
  Effect,
  Match,
  Option,
  pipe,
  Result,
  Schema,
  SchemaTransformation,
  Stdio,
  Stream,
  Struct,
} from 'effect'
import { PreprintReviewImported, StructuredPrereviewSchema } from '../Events.ts'
import { Html, HtmlFromSelfSchema } from '../html.ts'
import { NameSchema } from '../types/Name.ts'
import * as OrcidId from '../types/OrcidId.ts'
import { type Pseudonym, PseudonymSchema } from '../types/Pseudonym.ts'
import { PreprintReviews } from '../Domain/PreprintReviews/index.ts'
import { Prereviewers } from '../Prereviewers/index.ts'

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

type AuthorToImport = (typeof PrereviewToImportSchema.Type)['authors'][number]

type ImportedAuthor = (typeof PreprintReviewImported.Type)['authors'][number]

const resolveAuthor = <E1, E2>(
  author: AuthorToImport,
  getOrcidIdFromPseudonym: (pseudonym: Pseudonym) => Effect.Effect<Result.Result<OrcidId.OrcidId, E1>, E2>,
): Effect.Effect<ImportedAuthor, E1 | E2> =>
  Match.valueTags(author, {
    PublicPersona: ({ name, orcidId }) =>
      Effect.succeed({ _tag: 'PublicPersona', name: Option.some(name), orcidId } as const),
    PseudonymPersona: ({ pseudonym }) =>
      pipe(
        getOrcidIdFromPseudonym(pseudonym),
        Effect.flatMap(Effect.fromResult),
        Effect.map(orcidId => ({ _tag: 'PseudonymPersona', orcidId }) as const),
      ),
    Unknown: ({ name }) => Effect.succeed({ _tag: 'Unknown', name: Option.some(name) } as const),
  })

const program = Effect.fnUntraced(function* () {
  const preprintReviews = yield* PreprintReviews
  const prereviewers = yield* Prereviewers

  const stdio = yield* Stdio.Stdio

  const input = yield* Stream.mkString(Stream.decodeText(stdio.stdin))

  const items = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Array(PrereviewToImportSchema)))(input)

  yield* Console.log(`importing ${Array.length(items)} preprint reviews`)

  const results = yield* Effect.forEach(items, item =>
    pipe(
      Effect.forEach(item.authors, author => resolveAuthor(author, prereviewers.getOrcidIdFromPseudonym)),
      Effect.flatMap(authors =>
        Array.isArrayNonEmpty(authors)
          ? preprintReviews.importPreprintReview({ ...item, authors })
          : Effect.die('Authors unexpectedly empty'),
      ),
      Effect.result,
      Effect.map(Result.mapError(error => ({ id: item.id, error }))),
    ),
  )

  const [successes, failures] = Array.separate(results)

  yield* Console.log(`successfully processed ${Array.length(successes)} preprint reviews`)

  if (Array.isArrayNonEmpty(failures)) {
    yield* Console.error(`failed to import ${Array.length(failures)} preprint reviews:`)
    yield* Effect.forEach(failures, ({ id, error }) =>
      Console.error(
        `  ${id}: ${error._tag === 'UnexpectedPreviousImport' ? `${error._tag} (${error.difference} differs)` : error._tag}`,
      ),
    )
  }
})

export const ImportPreprintReviews = Command.make('import-preprint-reviews', {}, program)
