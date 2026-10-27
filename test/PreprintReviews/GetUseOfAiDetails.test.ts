import { expect, it } from '@effect/vitest'
import { Effect, Either, Option } from 'effect'
import { Keyv } from '../../src/keyv.ts'
import * as _ from '../../src/PreprintReviews/GetUseOfAiDetails.ts'
import { FormC, formKey, PreprintReviewNotFound } from '../../src/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'

const orcidId = OrcidId('0000-0002-1825-0097')
const differentOrcidId = OrcidId('0000-0002-6109-0367')

const preprintWithNoReview = new BiorxivPreprintId({ value: Doi('10.1101/no-review') })
const preprintWithReview = new BiorxivPreprintId({ value: Doi('10.1101/with-review') })
const preprintWithReviewAnswered = new BiorxivPreprintId({ value: Doi('10.1101/with-review-answered') })
const preprintWithReviewAnsweredWithDetails = new BiorxivPreprintId({
  value: Doi('10.1101/with-review-answered-with-details'),
})
const preprintWithReviewAnsweredNoWithDetails = new BiorxivPreprintId({
  value: Doi('10.1101/with-review-answered-no-with-details'),
})

const details = NonEmptyString('Some details')

it.effect.each<[string, _.Input, _.Result]>([
  ['no review', { orcidId, preprintId: preprintWithNoReview }, Either.left(new PreprintReviewNotFound({}))],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview },
    Either.left(new PreprintReviewNotFound({})),
  ],
  [
    'not answered',
    { orcidId, preprintId: preprintWithReview },
    Either.right({
      generativeAiIdeas: Option.none(),
      generativeAiIdeasDetails: Option.none(),
      moreAuthors: undefined,
      alreadyWritten: undefined,
    }),
  ],
  [
    'answered',
    { orcidId, preprintId: preprintWithReviewAnswered },
    Either.right({
      generativeAiIdeas: Option.some('yes'),
      generativeAiIdeasDetails: Option.none(),
      moreAuthors: 'yes-private',
      alreadyWritten: 'no',
    }),
  ],
  [
    'answered with details',
    { orcidId, preprintId: preprintWithReviewAnsweredWithDetails },
    Either.right({
      generativeAiIdeas: Option.some('yes'),
      generativeAiIdeasDetails: Option.some(details),
      moreAuthors: undefined,
      alreadyWritten: undefined,
    }),
  ],
  [
    'answered no with leftover details',
    { orcidId, preprintId: preprintWithReviewAnsweredNoWithDetails },
    Either.right({
      generativeAiIdeas: Option.some('no'),
      generativeAiIdeasDetails: Option.none(),
      moreAuthors: undefined,
      alreadyWritten: undefined,
    }),
  ],
])('%s', ([, input, expectedReturn]) =>
  Effect.gen(function* () {
    const formStore = new Keyv()

    yield* Effect.promise(() => formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({})))
    yield* Effect.promise(() =>
      formStore.set(
        formKey(orcidId, preprintWithReviewAnswered),
        FormC.encode({ generativeAiIdeas: 'yes', moreAuthors: 'yes-private', alreadyWritten: 'no' }),
      ),
    )
    yield* Effect.promise(() =>
      formStore.set(
        formKey(orcidId, preprintWithReviewAnsweredWithDetails),
        FormC.encode({ generativeAiIdeas: 'yes', generativeAiIdeasDetails: details }),
      ),
    )
    yield* Effect.promise(() =>
      formStore.set(
        formKey(orcidId, preprintWithReviewAnsweredNoWithDetails),
        FormC.encode({ generativeAiIdeas: 'no', generativeAiIdeasDetails: details }),
      ),
    )

    const actualReturn = yield* Effect.either(_.GetUseOfAiDetails(formStore)(input))

    expect(actualReturn).toStrictEqual(expectedReturn)
  }),
)
