import { expect, it } from '@effect/vitest'
import { type Array, Either } from 'effect'
import * as _ from '../../src/Clubs/GetClubBySlug.ts'
import { type ClubDetails, ClubNotFound } from '../../src/Clubs/index.ts'
import { html } from '../../src/html.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Slug } from '../../src/types/Slug.ts'
import { PlainDate } from '../../src/types/Temporal.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const slug = Slug('superheroes-club')
const otherSlug = Slug('sidekicks-club')

const clubs = [
  {
    id: Uuid('a0b77186-b242-44ed-a969-49eca634d701'),
    name: {
      language: 'en',
      text: Name('Superheroes Club'),
    },
    slug: Slug('superheroes-club'),
    description: {
      language: 'en',
      text: html`<p>Some text.</p>`,
    },
    added: PlainDate.from('2024-01-02'),
    leads: [OrcidId('0000-0002-1825-0097')],
  },
] satisfies Array.NonEmptyReadonlyArray<ClubDetails>

it.each<[string, Slug, _.Result]>([
  ['by slug', slug, Either.right({ id: clubs[0].id, language: clubs[0].name.language, name: clubs[0].name.text })],
  ['by other slug', otherSlug, Either.left(new ClubNotFound())],
])('with a club name (%s)', (_name, input, expected) => {
  const actual = _.GetClubBySlug(clubs)(input)

  expect(actual).toStrictEqual(expected)
})
