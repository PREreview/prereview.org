import { expect, it } from '@effect/vitest'
import { Effect, Either } from 'effect'
import { Keyv } from '../../src/keyv.ts'
import * as _ from '../../src/PreprintReviews/AddReviewToAClub.ts'
import { PreprintReviewNotFound, UnknownClub } from '../../src/PreprintReviews/index.ts'
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
const differentClubId = Uuid('980658e9-e025-46ff-9cee-f46ff02fc3f8')
const unknownClubId = Uuid('17248b36-7ba3-4fc2-b9c4-1edc10b57463')

const clubs = [clubId, differentClubId]

it.effect.each<[string, _.Input, Either.Either<void, _.Error>, (Uuid | null)?]>([
  ['no review', { orcidId, preprintId: preprintWithNoReview, clubId }, Either.left(new PreprintReviewNotFound({}))],
  [
    'different ORCID iD',
    { orcidId: differentOrcidId, preprintId: preprintWithReview, clubId },
    Either.left(new PreprintReviewNotFound({})),
  ],
  ['not answered', { orcidId, preprintId: preprintWithReview, clubId }, Either.void, clubId],
  ['answered with no club', { orcidId, preprintId: preprintWithReviewNoClub, clubId }, Either.void, clubId],
  [
    'answered with unknown club',
    { orcidId, preprintId: preprintWithReviewNoClub, clubId: unknownClubId },
    Either.left(new UnknownClub()),
    null,
  ],
  ['answered with club', { orcidId, preprintId: preprintWithReviewClub, clubId }, Either.void, clubId],
  [
    'answered with different club',
    { orcidId, preprintId: preprintWithReviewClub, clubId: differentClubId },
    Either.void,
    differentClubId,
  ],
])('%s', ([, input, expectedReturn, expectedClub]) =>
  Effect.gen(function* () {
    const formStore = new Keyv()

    yield* Effect.promise(() => formStore.set(formKey(orcidId, preprintWithReview), FormC.encode({})))
    yield* Effect.promise(() => formStore.set(formKey(orcidId, preprintWithReviewNoClub), FormC.encode({ club: null })))
    yield* Effect.promise(() =>
      formStore.set(formKey(orcidId, preprintWithReviewClub), FormC.encode({ club: clubId as never })),
    )

    const actualReturn = yield* Effect.either(_.AddReviewToAClub(formStore, clubs)(input))
    const actualState = yield* Effect.promise(() => formStore.get(formKey(input.orcidId, input.preprintId)))

    expect(actualReturn).toStrictEqual(expectedReturn)
    if (expectedClub !== undefined) {
      expect(actualState).toMatchObject({ club: expectedClub })
    } else {
      expect(actualState).toBeUndefined()
    }
  }),
)
