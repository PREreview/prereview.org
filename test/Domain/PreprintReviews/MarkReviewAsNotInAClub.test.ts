import { expect, it } from '../../vitest.ts'
import { Effect, Option, Result } from 'effect'
import * as FormStore from '../../../src/Domain/PreprintReviews/FormStore.ts'
import { FormC, formKey, PreprintReviewNotFound } from '../../../src/Domain/PreprintReviews/index.ts'
import * as _ from '../../../src/Domain/PreprintReviews/MarkReviewAsNotInAClub.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
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

it.effect.each<[string, _.Input, Result.Result<void, _.Error>, (Uuid | null)?]>([
  ['no review', { orcidId, preprintId: preprintWithNoReview }, Result.fail(new PreprintReviewNotFound({}))],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview },
    Result.fail(new PreprintReviewNotFound({})),
  ],
  ['not answered', { orcidId, preprintId: preprintWithReview }, Result.void, null],
  ['answered with no club', { orcidId, preprintId: preprintWithReviewNoClub }, Result.void, null],
  ['answered with club', { orcidId, preprintId: preprintWithReviewClub }, Result.void, null],
])('%s', ([, input, expectedReturn, expectedClub]) =>
  Effect.gen(function* () {
    const formStore = yield* FormStore.Store

    yield* formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({}))
    yield* formStore.set(formKey(orcidId, preprintWithReviewNoClub), FormC.encode({ club: null }))
    yield* formStore.set(formKey(orcidId, preprintWithReviewClub), FormC.encode({ club: clubId }))

    const actualReturn = yield* Effect.result(_.MarkReviewAsNotInAClub(formStore)(input))
    const actualState = yield* Effect.map(
      formStore.get(formKey(input.orcidId, input.preprintId)),
      Option.getOrUndefined,
    )

    expect(actualReturn).toStrictEqual(expectedReturn)
    if (expectedClub !== undefined) {
      expect(actualState).toMatchObject({ club: expectedClub })
    } else {
      expect(actualState).toBeUndefined()
    }
  }).pipe(Effect.provide(FormStore.layerInMemory)),
)
