import { Command } from '@effect/cli'
import { Array, Console, Effect, Option, ParseResult, Schema, Stream, String } from 'effect'
import { PreprintReviews } from '../PreprintReviews/index.ts'
import * as Preprints from '../Preprints/index.ts'
import { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'

const RapidPrereviewInputSchema = Schema.Union(
  Schema.Struct({
    _id: NonEmptyString.NonEmptyStringSchema,
    '@type': Schema.Literal('RapidPREreviewAction'),
    actionStatus: Schema.Literal('CompletedActionStatus'),
    agent: NonEmptyString.NonEmptyStringSchema,
    object: Schema.Union(
      Schema.Struct({
        doi: Preprints.IndeterminatePreprintIdFromDoiSchema,
      }),
      Schema.Struct({
        arXivId: Schema.transformOrFail(Schema.String, Preprints.IndeterminatePreprintIdFromDoiSchema, {
          strict: true,
          decode: id => ParseResult.succeed(`10.48550/arxiv.${id}`),
          encode: (value, _, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, value)),
        }),
      }),
    ),
    resultReview: Schema.Struct({
      '@type': Schema.Literal('RapidPREreview'),
      reviewAnswer: Schema.NonEmptyArray(
        Schema.Union(
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynNovel'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Are the findings novel?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynCoherent'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Are the principal conclusions supported by the data and analysis?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynFuture'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Are the results likely to lead to future research?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynEthics'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal(
                'Have the authors adequately discussed ethical concerns',
                'Have the authors adequately discussed ethical concerns?',
              ),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynLimitations'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Does the manuscript discuss limitations?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynNewData'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Does the manuscript include new data?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynAvailableData'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal(
                'Are the data used in the manuscript available?',
                'Are the data used in the manuscript available? If yes, please paste the link to the data in the box below.',
              ),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('Answer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:linkToData'),
              '@type': Schema.Literal('Question'),
              text: Schema.Literal('Links to the data used in the manuscript'),
            }),
            text: Schema.String,
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynAvailableCode'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Is the code used in the manuscript available?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynReproducibility'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Is sufficient detail provided to allow reproduction of the study?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynMethods'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Are the methods and statistics appropriate for the analysis?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynRecommend'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Would you recommend this manuscript to others?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('YesNoAnswer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:ynPeerReview'),
              '@type': Schema.Literal('YesNoQuestion'),
              text: Schema.Literal('Do you recommend this manuscript for peer review?'),
            }),
            text: Schema.Literal('yes', 'no', 'not applicable', 'unsure'),
          }),
          Schema.Struct({
            '@type': Schema.Literal('Answer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:cMethods'),
              '@type': Schema.Literal('Question'),
              text: Schema.Literal('Technical comments on methods, data, limitations'),
            }),
            text: Schema.String,
          }),
          Schema.Struct({
            '@type': Schema.Literal('Answer'),
            parentItem: Schema.Struct({
              '@id': Schema.Literal('question:cRelevance'),
              '@type': Schema.Literal('Question'),
              text: Schema.Literal('Editorial comments on novelty, importance, relevance'),
            }),
            text: Schema.String,
          }),
        ),
      ),
    }),
    endTime: Temporal.InstantSchema,
  }),
  Schema.Struct({
    '@type': Schema.Literal('Person'),
    orcid: OrcidId.OrcidIdSchema,
    hasRole: Schema.NonEmptyArray(NonEmptyString.NonEmptyStringSchema),
  }),
  Schema.Struct({
    _id: NonEmptyString.NonEmptyStringSchema,
    '@type': Schema.Literal('AnonymousReviewerRole', 'PublicReviewerRole'),
  }),
  Schema.Struct({
    '@type': Schema.UndefinedOr(
      Schema.Literal('RequestForRapidPREreviewAction', 'AnonymousReviewerRole', 'PublicReviewerRole'),
    ),
  }),
)

const program = Effect.fnUntraced(function* () {
  const preprintReviews = yield* PreprintReviews

  const stdinStream = Stream.fromAsyncIterable(
    process.stdin as AsyncIterable<string>,
    () => new Error('Failed to read from stdin'),
  )

  const input = yield* Stream.runFold(stdinStream, '', String.concat)

  const items = yield* Schema.decode(Schema.parseJson(Schema.Array(RapidPrereviewInputSchema)))(input)

  const reviewItems = Array.filter(items, item => item['@type'] === 'RapidPREreviewAction')
  const peopleItems = Array.filter(items, item => item['@type'] === 'Person')
  const roleItems = Array.filter(
    items,
    (
      item,
    ): item is Extract<
      typeof RapidPrereviewInputSchema.Type,
      { '@type': 'AnonymousReviewerRole' | 'PublicReviewerRole' }
    > => item['@type'] === 'AnonymousReviewerRole' || item['@type'] === 'PublicReviewerRole',
  )

  yield* Effect.forEach(
    reviewItems,
    Effect.fnUntraced(function* (reviewItem) {
      const role = Option.getOrThrow(Array.findFirst(roleItems, roleItem => roleItem._id === reviewItem.agent))
      const person = Option.getOrThrow(
        Array.findFirst(peopleItems, personItem => Array.contains(personItem.hasRole, reviewItem.agent)),
      )

      yield* preprintReviews.importRapidPrereview({
        author: {
          persona: role['@type'] === 'PublicReviewerRole' ? 'public' : 'pseudonym',
          orcidId: person.orcid,
        },
        publishedAt: reviewItem.endTime,
        preprintId: 'doi' in reviewItem.object ? reviewItem.object.doi : reviewItem.object.arXivId,
        rapidPrereviewId: yield* Uuid.v5(
          `${person.orcid}-${role['@type'] === 'PublicReviewerRole' ? 'public' : 'pseudonym'}-${'doi' in reviewItem.object ? reviewItem.object.doi.value : reviewItem.object.arXivId.value}`,
          ImportUuidNamespace,
        ),
        questions: {
          availableCode: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynAvailableCode'
                ? Option.some(answer.text as never)
                : Option.none(),
            ),
          ),
          availableData: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynAvailableData'
                ? Option.some(answer.text as never)
                : Option.none(),
            ),
          ),
          coherent: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynCoherent' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          dataLink: Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
            answer.parentItem['@id'] === 'question:linkToData' && answer.text !== ''
              ? Option.some(answer.text.trim() as never)
              : Option.none(),
          ),
          ethics: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynEthics' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          future: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynFuture' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          limitations: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynLimitations' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          methods: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynMethods' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          newData: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynNewData' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          novel: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynNovel' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          peerReview: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynPeerReview' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          recommend: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynRecommend' ? Option.some(answer.text as never) : Option.none(),
            ),
          ),
          reproducibility: Option.getOrThrow(
            Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
              answer.parentItem['@id'] === 'question:ynReproducibility'
                ? Option.some(answer.text as never)
                : Option.none(),
            ),
          ),
          technicalComments: Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
            answer.parentItem['@id'] === 'question:cMethods' && answer.text !== ''
              ? Option.some(answer.text.trim() as never)
              : Option.none(),
          ),
          editorialComments: Array.findFirst(reviewItem.resultReview.reviewAnswer, answer =>
            answer.parentItem['@id'] === 'question:cRelevance' && answer.text !== ''
              ? Option.some(answer.text.trim() as never)
              : Option.none(),
          ),
        },
      })
    }),
  )
}, Effect.tapError(Console.log))

export const ImportOsrpreRapidPrereview = Command.make('import-osrpre-rapid-prereview', {}, program)

const ImportUuidNamespace = Uuid.Uuid('7f6dc82a-df05-462c-98c3-d4399f22a8a1')
