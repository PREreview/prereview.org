import { Command } from '@effect/cli'
import { Console, Effect, Option, ParseResult, Schema, Stream, String } from 'effect'
import { ImportRapidPrereviewInput, PreprintReviews } from '../PreprintReviews/index.ts'
import * as Preprints from '../Preprints/index.ts'
import { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'

const RapidPrereviewInputSchema = Schema.Struct({
  uuid: Uuid.UuidSchema,
  created_at: Temporal.InstantSchema,
  is_published: Schema.Literal(false),
  is_flagged: Schema.Literal(false),
  yn_novel: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_future: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_reproducibility: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_methods: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_coherent: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_limitations: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_ethics: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_new_data: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_recommend: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_peer_review: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_available_code: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  yn_available_data: Schema.Literal('yes', 'no', 'N/A', 'unsure'),
  link_to_data: Schema.OptionFromNullOr(Schema.compose(Schema.Trim, NonEmptyString.NonEmptyStringSchema)),
  coi: Schema.Literal(null),
  is_anonymous: Schema.Boolean,
  orcid: OrcidId.OrcidIdSchema,
  handle: Schema.Union(
    Preprints.IndeterminatePreprintIdWithDoiFromStringSchema,
    Schema.transform(
      Schema.TemplateLiteralParser('arxiv:', Schema.String),
      Preprints.IndeterminatePreprintIdWithDoiFromStringSchema,
      {
        strict: true,
        decode: ([, id]) => `doi:10.48550/arxiv.${id}` as const,
        encode: id => id as never,
      },
    ),
  ),
})

const answerMap = {
  yes: 'yes',
  no: 'no',
  'N/A': 'not applicable',
  unsure: 'unsure',
} as const

const RapidPrereviewSchema = Schema.transformOrFail(RapidPrereviewInputSchema, ImportRapidPrereviewInput, {
  strict: true,
  decode: value =>
    Effect.gen(function* () {
      return {
        author: {
          persona: value.is_anonymous ? 'pseudonym' : 'public',
          orcidId: value.orcid,
        },
        publishedAt: value.created_at,
        preprintId: value.handle,
        rapidPrereviewId: yield* Uuid.v5(
          `${value.orcid}-${value.is_anonymous ? 'pseudonym' : 'public'}-${value.handle.value}`,
          ImportUuidNamespace,
        ),
        questions: {
          availableCode: answerMap[value.yn_available_code],
          availableData: answerMap[value.yn_available_data],
          coherent: answerMap[value.yn_coherent],
          dataLink: value.link_to_data,
          ethics: answerMap[value.yn_ethics],
          future: answerMap[value.yn_future],
          limitations: answerMap[value.yn_limitations],
          methods: answerMap[value.yn_methods],
          newData: answerMap[value.yn_new_data],
          novel: answerMap[value.yn_novel],
          peerReview: answerMap[value.yn_peer_review],
          recommend: answerMap[value.yn_recommend],
          reproducibility: answerMap[value.yn_reproducibility],
          technicalComments: Option.none(),
          editorialComments: Option.none(),
        },
      }
    }),
  encode: (value, _, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, value)),
})

const program = Effect.fnUntraced(function* () {
  const preprintReviews = yield* PreprintReviews

  const stdinStream = Stream.fromAsyncIterable(
    process.stdin as AsyncIterable<string>,
    () => new Error('Failed to read from stdin'),
  )

  const input = yield* Stream.runFold(stdinStream, '', String.concat)

  const decoded = yield* Schema.decode(Schema.parseJson(Schema.Array(RapidPrereviewSchema)))(input)

  yield* Effect.forEach(decoded, rapidPrereview => preprintReviews.importRapidPrereview(rapidPrereview))
}, Effect.tapError(Console.log))

export const ImportRapidPrereview = Command.make('import-rapid-prereview', {}, program)

const ImportUuidNamespace = Uuid.Uuid('7f6dc82a-df05-462c-98c3-d4399f22a8a1')
