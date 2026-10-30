import { expect, it } from '../vitest.ts'
import { Effect, Either } from 'effect'
import { Keyv } from '../../src/keyv.ts'
import * as _ from '../../src/PreprintReviews/GetNextExpectedCommand.ts'
import { FormC, formKey, PreprintReviewNotFound } from '../../src/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'

const orcidId = OrcidId('0000-0002-1825-0097')
const differentOrcidId = OrcidId('0000-0002-6109-0367')

const preprintWithNoReview = new BiorxivPreprintId({ value: Doi('10.1101/no-review') })
const preprintWithReview = new BiorxivPreprintId({ value: Doi('10.1101/with-review') })
const preprintWithReviewAlreadyWritten = new BiorxivPreprintId({ value: Doi('10.1101/with-review-already-written') })

it.effect.each<[string, _.Input, _.Result]>([
  ['no review', { orcidId, preprintId: preprintWithNoReview }, Either.left(new PreprintReviewNotFound({}))],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview },
    Either.left(new PreprintReviewNotFound({})),
  ],
  ['nothing answered', { orcidId, preprintId: preprintWithReview }, Either.right('ChooseReviewType')],
  ['already written', { orcidId, preprintId: preprintWithReviewAlreadyWritten }, Either.right('DeclareUseOfAi')],
])('%s', ([, input, expectedReturn]) =>
  Effect.gen(function* () {
    const formStore = new Keyv()

    yield* Effect.promise(() => formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({})))
    yield* Effect.promise(() =>
      formStore.set(formKey(orcidId, preprintWithReviewAlreadyWritten), FormC.encode({ alreadyWritten: 'yes' })),
    )

    const actualReturn = yield* Effect.either(_.GetNextExpectedCommand(formStore)(input))

    expect(actualReturn).toStrictEqual(expectedReturn)
  }),
)
