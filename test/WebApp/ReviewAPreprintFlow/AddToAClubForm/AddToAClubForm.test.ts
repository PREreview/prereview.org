import { describe, expect, it } from '@effect/vitest'
import { Option } from 'effect'
import type { ClubId } from '../../../../src/Clubs/index.ts'
import * as _ from '../../../../src/WebApp/ReviewAPreprintFlow/AddToAClubPage/AddToAClubForm.ts'

describe('fromChoice', () => {
  it.each<[string, Option.Option<ClubId | null>, _.AddToAClubForm]>([
    ['empty', Option.none(), new _.EmptyForm()],
    ['not a club review', Option.some(null), new _.CompletedForm({ addToClub: 'not-a-club-review' })],
    [
      'club review',
      Option.some('2c5334ae-e361-48c3-bcca-6810c2f33cb4'),
      new _.CompletedForm({ addToClub: '2c5334ae-e361-48c3-bcca-6810c2f33cb4' }),
    ],
  ])('%s', (_name, choice, expected) => {
    const actual = _.fromChoice(choice)

    expect(actual).toStrictEqual(expected)
  })
})
