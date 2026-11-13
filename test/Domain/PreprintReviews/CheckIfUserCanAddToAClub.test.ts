import { expect, it } from '../../vitest.ts'
import { Effect, Result, Option } from 'effect'
import * as FormStore from '../../../src/Domain/PreprintReviews/FormStore.ts'
import * as _ from '../../../src/Domain/PreprintReviews/CheckIfUserCanAddToAClub.ts'
import { FormC, formKey, PreprintReviewNotFound } from '../../../src/Domain/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../../src/Domain/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const orcidId = OrcidId('0000-0002-1825-0097')
const differentOrcidId = OrcidId('0000-0002-6109-0367')

const preprintWithNoReview = new BiorxivPreprintId({ value: Doi('10.1101/no-review') })
const preprintWithReview = new BiorxivPreprintId({ value: Doi('10.1101/with-review') })
const preprintWithReviewNoClub = new BiorxivPreprintId({ value: Doi('10.1101/with-review-no-club') })
const preprintWithReviewClub = new BiorxivPreprintId({ value: Doi('10.1101/with-review-club') })

const clubId = Uuid('13e21570-0d1a-47f0-b378-b8c20776496a')

it.effect.each<[string, _.Input, _.Result]>([
  ['no review', { orcidId, preprintId: preprintWithNoReview }, Result.fail(new PreprintReviewNotFound({}))],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview },
    Result.fail(new PreprintReviewNotFound({})),
  ],
  ['not answered', { orcidId, preprintId: preprintWithReview }, Result.succeed(Option.none())],
  ['answered, no club', { orcidId, preprintId: preprintWithReviewNoClub }, Result.succeed(Option.some(null))],
  ['answered, with club', { orcidId, preprintId: preprintWithReviewClub }, Result.succeed(Option.some(clubId))],
])('%s', ([, input, expectedReturn]) =>
  Effect.gen(function* () {
    const formStore = yield* FormStore.Store

    yield* formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({}))
    yield* formStore.set(formKey(orcidId, preprintWithReviewNoClub), FormC.encode({ club: null }))
    yield* formStore.set(formKey(orcidId, preprintWithReviewClub), FormC.encode({ club: clubId }))

    const actualReturn = yield* Effect.result(_.CheckIfUserCanAddToAClub(formStore)(input))

    expect(actualReturn).toStrictEqual(expectedReturn)
  }).pipe(Effect.provide(FormStore.layerInMemory)),
)
