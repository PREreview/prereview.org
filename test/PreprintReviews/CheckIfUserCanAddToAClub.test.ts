import { expect, it } from '@effect/vitest'
import { Effect, Either, Option } from 'effect'
import { Keyv } from '../../src/keyv.ts'
import * as _ from '../../src/PreprintReviews/CheckIfUserCanAddToAClub.ts'
import { PreprintReviewNotFound } from '../../src/PreprintReviews/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { FormC, formKey } from '../../src/WebApp/write-review/form.ts'

const orcidId = OrcidId('0000-0002-1825-0097')
const differentOrcidId = OrcidId('0000-0002-6109-0367')

const preprintWithNoReview = new BiorxivPreprintId({ value: Doi('10.1101/no-review') })
const preprintWithReview = new BiorxivPreprintId({ value: Doi('10.1101/with-review') })
const preprintWithReviewNoClub = new BiorxivPreprintId({ value: Doi('10.1101/with-review-no-club') })
const preprintWithReviewClub = new BiorxivPreprintId({ value: Doi('10.1101/with-review-club') })

const clubId = Uuid('13e21570-0d1a-47f0-b378-b8c20776496a')

it.effect.each<[string, _.Input, _.Result]>([
  ['no review', { orcidId, preprintId: preprintWithNoReview }, Either.left(new PreprintReviewNotFound({}))],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview },
    Either.left(new PreprintReviewNotFound({})),
  ],
  ['not answered', { orcidId, preprintId: preprintWithReview }, Either.right(Option.none())],
  ['answered, no club', { orcidId, preprintId: preprintWithReviewNoClub }, Either.right(Option.some(null))],
  ['answered, with club', { orcidId, preprintId: preprintWithReviewClub }, Either.right(Option.some(clubId))],
])('%s', ([, input, expectedReturn]) =>
  Effect.gen(function* () {
    const formStore = new Keyv()

    yield* Effect.promise(() => formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({})))
    yield* Effect.promise(() => formStore.set(formKey(orcidId, preprintWithReviewNoClub), FormC.encode({ club: null })))
    yield* Effect.promise(() =>
      formStore.set(formKey(orcidId, preprintWithReviewClub), FormC.encode({ club: clubId as never })),
    )

    const actualReturn = yield* Effect.either(_.CheckIfUserCanAddToAClub(formStore)(input))

    expect(actualReturn).toStrictEqual(expectedReturn)
  }),
)
