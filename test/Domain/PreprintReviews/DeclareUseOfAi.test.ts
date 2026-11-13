import { expect, it } from '../../vitest.ts'
import { Effect, Result, Option } from 'effect'
import * as FormStore from '../../../src/Domain/PreprintReviews/FormStore.ts'
import * as _ from '../../../src/Domain/PreprintReviews/DeclareUseOfAi.ts'
import { FormC, formKey, PreprintReviewNotFound } from '../../../src/Domain/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../../src/Domain/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'

const orcidId = OrcidId('0000-0002-1825-0097')
const differentOrcidId = OrcidId('0000-0002-6109-0367')

const preprintWithNoReview = new BiorxivPreprintId({ value: Doi('10.1101/no-review') })
const preprintWithReview = new BiorxivPreprintId({ value: Doi('10.1101/with-review') })
const preprintWithReviewAnsweredYes = new BiorxivPreprintId({ value: Doi('10.1101/with-review-answered-yes') })
const preprintWithReviewAnsweredNo = new BiorxivPreprintId({ value: Doi('10.1101/with-review-answered-no') })
const preprintWithReviewAnsweredYesWithDetails = new BiorxivPreprintId({
  value: Doi('10.1101/with-review-answered-yes-with-details'),
})

const details = NonEmptyString('Some details')
const otherDetails = NonEmptyString('Some other details')

it.effect.each<
  [
    string,
    _.Input,
    Result.Result<void, _.Error>,
    { generativeAiIdeas: 'yes' | 'no'; generativeAiIdeasDetails?: NonEmptyString }?,
  ]
>([
  [
    'no review',
    { orcidId, preprintId: preprintWithNoReview, generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.none() },
    Result.fail(new PreprintReviewNotFound({})),
  ],
  [
    'different ORCID iD',
    {
      orcidId: differentOrcidId,
      preprintId: preprintWithReview,
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: Option.none(),
    },
    Result.fail(new PreprintReviewNotFound({})),
  ],
  [
    'not answered',
    { orcidId, preprintId: preprintWithReview, generativeAiIdeas: 'yes', generativeAiIdeasDetails: Option.none() },
    Result.void,
    { generativeAiIdeas: 'yes' },
  ],
  [
    'not answered, with details',
    {
      orcidId,
      preprintId: preprintWithReview,
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: Option.some(details),
    },
    Result.void,
    { generativeAiIdeas: 'yes', generativeAiIdeasDetails: details },
  ],
  [
    'answered with the same answer',
    {
      orcidId,
      preprintId: preprintWithReviewAnsweredYes,
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: Option.none(),
    },
    Result.void,
    { generativeAiIdeas: 'yes' },
  ],
  [
    'answered with a different answer',
    {
      orcidId,
      preprintId: preprintWithReviewAnsweredNo,
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: Option.none(),
    },
    Result.void,
    { generativeAiIdeas: 'yes' },
  ],
  [
    'answered with the same details',
    {
      orcidId,
      preprintId: preprintWithReviewAnsweredYesWithDetails,
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: Option.some(details),
    },
    Result.void,
    { generativeAiIdeas: 'yes', generativeAiIdeasDetails: details },
  ],
  [
    'answered with different details',
    {
      orcidId,
      preprintId: preprintWithReviewAnsweredYesWithDetails,
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: Option.some(otherDetails),
    },
    Result.void,
    { generativeAiIdeas: 'yes', generativeAiIdeasDetails: otherDetails },
  ],
  [
    'answered with details removed',
    {
      orcidId,
      preprintId: preprintWithReviewAnsweredYesWithDetails,
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: Option.none(),
    },
    Result.void,
    { generativeAiIdeas: 'yes' },
  ],
  [
    'changed to no',
    { orcidId, preprintId: preprintWithReviewAnsweredYesWithDetails, generativeAiIdeas: 'no' },
    Result.void,
    { generativeAiIdeas: 'no' },
  ],
])('%s', ([, input, expectedReturn, expectedState]) =>
  Effect.gen(function* () {
    const formStore = yield* FormStore.Store

    yield* formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({}))
    yield* formStore.set(formKey(orcidId, preprintWithReviewAnsweredYes), FormC.encode({ generativeAiIdeas: 'yes' }))
    yield* formStore.set(formKey(orcidId, preprintWithReviewAnsweredNo), FormC.encode({ generativeAiIdeas: 'no' }))
    yield* formStore.set(
      formKey(orcidId, preprintWithReviewAnsweredYesWithDetails),
      FormC.encode({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: details }),
    )

    const actualReturn = yield* Effect.result(_.DeclareUseOfAi(formStore)(input))
    const actualState = yield* Effect.map(
      formStore.get(formKey(input.orcidId, input.preprintId)),
      Option.getOrUndefined,
    )

    expect(actualReturn).toStrictEqual(expectedReturn)
    expect(actualState).toEqual(expectedState)
  }).pipe(Effect.provide(FormStore.layerInMemory)),
)
