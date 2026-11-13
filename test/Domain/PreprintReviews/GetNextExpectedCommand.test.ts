import { expect, it } from '../../vitest.ts'
import { Effect, Result } from 'effect'
import * as FormStore from '../../../src/Domain/PreprintReviews/FormStore.ts'
import * as _ from '../../../src/Domain/PreprintReviews/GetNextExpectedCommand.ts'
import { FormC, formKey, PreprintReviewNotFound } from '../../../src/Domain/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../../src/Domain/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'

const orcidId = OrcidId('0000-0002-1825-0097')
const differentOrcidId = OrcidId('0000-0002-6109-0367')

const preprintWithNoReview = new BiorxivPreprintId({ value: Doi('10.1101/no-review') })
const preprintWithReview = new BiorxivPreprintId({ value: Doi('10.1101/with-review') })
const preprintWithReviewAlreadyWritten = new BiorxivPreprintId({ value: Doi('10.1101/with-review-already-written') })

it.effect.each<[string, _.Input, _.Result]>([
  ['no review', { orcidId, preprintId: preprintWithNoReview }, Result.fail(new PreprintReviewNotFound({}))],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview },
    Result.fail(new PreprintReviewNotFound({})),
  ],
  ['nothing answered', { orcidId, preprintId: preprintWithReview }, Result.succeed('ChooseReviewType')],
  ['already written', { orcidId, preprintId: preprintWithReviewAlreadyWritten }, Result.succeed('DeclareUseOfAi')],
])('%s', ([, input, expectedReturn]) =>
  Effect.gen(function* () {
    const formStore = yield* FormStore.Store

    yield* formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({}))
    yield* formStore.set(formKey(orcidId, preprintWithReviewAlreadyWritten), FormC.encode({ alreadyWritten: 'yes' }))

    const actualReturn = yield* Effect.result(_.GetNextExpectedCommand(formStore)(input))

    expect(actualReturn).toStrictEqual(expectedReturn)
  }).pipe(Effect.provide(FormStore.layerInMemory)),
)
