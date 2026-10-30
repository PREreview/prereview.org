import { expect, it, test } from '../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Commands from '../../../src/Commands.ts'
import * as _ from '../../../src/DatasetReviews/Commands/DeclareIfAiWasUsedToGenerateNewIdeas.ts'
import * as Errors from '../../../src/DatasetReviews/Errors.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import * as fc from '../../fc.ts'

const input = {
  answer: 'yes',
  detail: Option.none(),
  datasetReviewId: Uuid('5871bddf-a2ff-4dd8-9e63-c42b4a6df684'),
  userId: OrcidId('0000-0002-1825-0097'),
} satisfies _.Input

const inputWithDetail = {
  ...input,
  detail: Option.some(NonEmptyString('Some details')),
} satisfies _.Input

const inputWithDifferentDetail = {
  ...input,
  detail: Option.some(NonEmptyString('Some other details')),
} satisfies _.Input

const inputDifferentAnswer = {
  answer: 'no',
  datasetReviewId: input.datasetReviewId,
  userId: input.userId,
} satisfies _.Input

const inputDifferentDatasetReviewId = {
  ...input,
  datasetReviewId: Uuid('2f1254b2-1aea-4220-9a21-e119c9e7005e'),
} satisfies _.Input

const inputDifferentUserId = {
  ...input,
  userId: OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const started = new Events.DatasetReviewWasStarted({
  authorId: input.userId,
  datasetId: new Datasets.DryadDatasetId({ value: Doi('10.5061/dryad.wstqjq2n3') }),
  datasetReviewId: input.datasetReviewId,
})

const declared = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'yes', detail: Option.none() },
  datasetReviewId: input.datasetReviewId,
})

const declaredWithDetail = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'yes', detail: Option.some(NonEmptyString('Some details')) },
  datasetReviewId: input.datasetReviewId,
})

const declaredNo = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'no' },
  datasetReviewId: input.datasetReviewId,
})

const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId: input.datasetReviewId,
})

const published = new Events.DatasetReviewWasPublished({
  publicationDate: Temporal.Now.plainDateISO(),
  datasetReviewId: input.datasetReviewId,
})

test.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Either.Either<Option.Option<Events.Event>, _.Error | Commands.UnableToHandleCommand>,
  ]
>([
  ['no events', [], input, Either.left(new Errors.DatasetReviewHasNotBeenStarted())],
  [
    'not declared',
    [started],
    input,
    Either.right(
      Option.some(
        new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
          generativeAiIdeas: { answer: 'yes', detail: Option.none() },
          datasetReviewId: input.datasetReviewId,
        }),
      ),
    ),
  ],
  [
    'not declared, with a detail',
    [started],
    inputWithDetail,
    Either.right(
      Option.some(
        new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
          generativeAiIdeas: { answer: 'yes', detail: Option.some(NonEmptyString('Some details')) },
          datasetReviewId: input.datasetReviewId,
        }),
      ),
    ),
  ],
  ['same answer', [started, declared], input, Either.right(Option.none())],
  ['same answer and detail', [started, declaredWithDetail], inputWithDetail, Either.right(Option.none())],
  [
    'different answer',
    [started, declared],
    inputDifferentAnswer,
    Either.right(
      Option.some(
        new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
          generativeAiIdeas: { answer: 'no' },
          datasetReviewId: input.datasetReviewId,
        }),
      ),
    ),
  ],
  ['same answer of no', [started, declaredNo], inputDifferentAnswer, Either.right(Option.none())],
  [
    'no changed to yes',
    [started, declaredNo],
    inputWithDetail,
    Either.right(
      Option.some(
        new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
          generativeAiIdeas: { answer: 'yes', detail: Option.some(NonEmptyString('Some details')) },
          datasetReviewId: input.datasetReviewId,
        }),
      ),
    ),
  ],
  [
    'different detail',
    [started, declaredWithDetail],
    inputWithDifferentDetail,
    Either.right(
      Option.some(
        new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
          generativeAiIdeas: { answer: 'yes', detail: Option.some(NonEmptyString('Some other details')) },
          datasetReviewId: input.datasetReviewId,
        }),
      ),
    ),
  ],
  [
    'detail removed',
    [started, declaredWithDetail],
    input,
    Either.right(
      Option.some(
        new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
          generativeAiIdeas: { answer: 'yes', detail: Option.none() },
          datasetReviewId: input.datasetReviewId,
        }),
      ),
    ),
  ],
  [
    'different dataset review ID',
    [started],
    inputDifferentDatasetReviewId,
    Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
  ],
  [
    'different user ID',
    [started],
    inputDifferentUserId,
    Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' })),
  ],
  [
    'publication requested',
    [started, declared, publicationRequested],
    input,
    Either.left(new Errors.DatasetReviewIsBeingPublished()),
  ],
  [
    'published',
    [started, declared, publicationRequested, published],
    input,
    Either.left(new Errors.DatasetReviewHasBeenPublished()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, authorize, decide } = _.DeclareIfAiWasUsedToGenerateNewIdeas

  const state = foldState(events, input)

  const actual = authorize(state, input)
    ? decide(state, input)
    : Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' }))

  expect(actual).toStrictEqual(expected)
})

it.prop(
  'declaring the same answer again records nothing',
  [
    fc.oneof(
      fc.record({ answer: fc.constant('yes' as const), detail: fc.maybe(fc.nonEmptyString()) }),
      fc.record({ answer: fc.constant('no' as const) }),
    ),
  ],
  ([answer]) => {
    const { foldState, decide } = _.DeclareIfAiWasUsedToGenerateNewIdeas
    const input = { ...answer, datasetReviewId: started.datasetReviewId, userId: started.authorId } satisfies _.Input

    const event = Option.getOrThrow(Either.getOrThrow(decide(foldState([started], input), input)))

    const actual = decide(foldState([started, event], input), input)

    expect(actual).toStrictEqual(Either.right(Option.none()))
  },
)
