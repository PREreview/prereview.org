import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Either, Option } from 'effect'
import * as _ from '../../../../src/WebApp/ReviewAPreprintFlow/AddToAClubPage/AddToAClubForm.ts'
import { Uuid } from '../../../../src/types/Uuid.ts'

describe('fromBody', () => {
  it.each<[string, UrlParams.Input, _.AddToAClubForm]>([
    ['empty', {}, new _.InvalidForm({ addToClub: Either.left(new _.Missing()) })],
    [
      'valid club ID',
      { addToClub: '2c5334ae-e361-48c3-bcca-6810c2f33cb4' },
      new _.CompletedForm({ addToClub: Uuid('2c5334ae-e361-48c3-bcca-6810c2f33cb4') }),
    ],
    ['invalid club ID', { addToClub: 'not-a-club-id' }, new _.InvalidForm({ addToClub: Either.left(new _.Missing()) })],
    ['not a club review', { addToClub: 'not-a-club-review' }, new _.CompletedForm({ addToClub: 'not-a-club-review' })],
  ])('%s', (_name, input, expected) => {
    const body = UrlParams.fromInput(input)

    const actual = _.fromBody(body)

    expect(actual).toStrictEqual(expected)
  })
})

describe('fromChoice', () => {
  it.each<[string, Option.Option<Uuid | null>, _.AddToAClubForm]>([
    ['empty', Option.none(), new _.EmptyForm()],
    ['not a club review', Option.some(null), new _.CompletedForm({ addToClub: 'not-a-club-review' })],
    [
      'club review',
      Option.some(Uuid('2c5334ae-e361-48c3-bcca-6810c2f33cb4')),
      new _.CompletedForm({ addToClub: Uuid('2c5334ae-e361-48c3-bcca-6810c2f33cb4') }),
    ],
  ])('%s', (_name, choice, expected) => {
    const actual = _.fromChoice(choice)

    expect(actual).toStrictEqual(expected)
  })
})
