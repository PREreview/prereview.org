import { expect, it } from '@effect/vitest'
import { Effect, Either } from 'effect'
import { Keyv } from '../../src/keyv.ts'
import * as _ from '../../src/PreprintReviews/DeclareUseOfAi.ts'
import { FormC, formKey, PreprintReviewNotFound } from '../../src/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'

const orcidId = OrcidId('0000-0002-1825-0097')
const differentOrcidId = OrcidId('0000-0002-6109-0367')

const preprintWithNoReview = new BiorxivPreprintId({ value: Doi('10.1101/no-review') })
const preprintWithReview = new BiorxivPreprintId({ value: Doi('10.1101/with-review') })
const preprintWithReviewAnsweredYes = new BiorxivPreprintId({ value: Doi('10.1101/with-review-answered-yes') })
const preprintWithReviewAnsweredNo = new BiorxivPreprintId({ value: Doi('10.1101/with-review-answered-no') })

it.effect.each<[string, _.Input, Either.Either<void, _.Error>, ('yes' | 'no')?]>([
  [
    'no review',
    { orcidId, preprintId: preprintWithNoReview, generativeAiIdeas: 'yes' },
    Either.left(new PreprintReviewNotFound({})),
  ],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview, generativeAiIdeas: 'yes' },
    Either.left(new PreprintReviewNotFound({})),
  ],
  ['not answered', { orcidId, preprintId: preprintWithReview, generativeAiIdeas: 'yes' }, Either.void, 'yes'],
  [
    'answered with the same answer',
    { orcidId, preprintId: preprintWithReviewAnsweredYes, generativeAiIdeas: 'yes' },
    Either.void,
    'yes',
  ],
  [
    'answered with a different answer',
    { orcidId, preprintId: preprintWithReviewAnsweredNo, generativeAiIdeas: 'yes' },
    Either.void,
    'yes',
  ],
])('%s', ([, input, expectedReturn, expectedGenerativeAiIdeas]) =>
  Effect.gen(function* () {
    const formStore = new Keyv()

    yield* Effect.promise(() => formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({})))
    yield* Effect.promise(() =>
      formStore.set(formKey(orcidId, preprintWithReviewAnsweredYes), FormC.encode({ generativeAiIdeas: 'yes' })),
    )
    yield* Effect.promise(() =>
      formStore.set(formKey(orcidId, preprintWithReviewAnsweredNo), FormC.encode({ generativeAiIdeas: 'no' })),
    )

    const actualReturn = yield* Effect.either(_.DeclareUseOfAi(formStore)(input))
    const actualState = yield* Effect.promise(() => formStore.get(formKey(input.orcidId, input.preprintId)))

    expect(actualReturn).toStrictEqual(expectedReturn)
    if (expectedGenerativeAiIdeas !== undefined) {
      expect(actualState).toMatchObject({ generativeAiIdeas: expectedGenerativeAiIdeas })
    } else {
      expect(actualState).toBeUndefined()
    }
  }),
)
