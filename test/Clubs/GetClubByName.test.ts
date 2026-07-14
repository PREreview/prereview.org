import { expect, it } from '@effect/vitest'
import { type Array, Either } from 'effect'
import * as _ from '../../src/Clubs/GetClubByName.ts'
import { type ClubDetails, ClubNotFound } from '../../src/Clubs/index.ts'
import { html } from '../../src/html.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Slug } from '../../src/types/Slug.ts'
import { PlainDate } from '../../src/types/Temporal.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const clubName = Name('Superheroes Club')
const formerName = Name('Bad Guys Club')
const otherName = Name('Sidekicks Club')

const clubs = [
  {
    id: Uuid('a0b77186-b242-44ed-a969-49eca634d701'),
    name: {
      language: 'en',
      text: clubName,
    },
    slug: Slug('superheroes-club'),
    description: {
      language: 'en',
      text: html`<p>Some text.</p>`,
    },
    added: PlainDate.from('2024-01-02'),
    leads: [OrcidId('0000-0002-1825-0097')],
  },
  {
    id: Uuid('26a8ce99-8c88-4874-bfe6-71324b8970c9'),
    name: {
      language: 'en',
      text: Name('Villains Club'),
    },
    formerNames: [formerName],
    slug: Slug('villains-club'),
    description: {
      language: 'en',
      text: html`<p>Some text.</p>`,
    },
    added: PlainDate.from('2025-01-02'),
    leads: [OrcidId('0000-0003-4921-6155')],
  },
] satisfies Array.NonEmptyReadonlyArray<ClubDetails>

it.each<[string, Name, _.Result]>([
  [
    'by name',
    clubName,
    Either.right({ id: clubs[0].id, language: clubs[0].name.language, name: clubs[0].name.text, slug: clubs[0].slug }),
  ],
  [
    'by former name',
    formerName,
    Either.right({ id: clubs[1].id, language: clubs[1].name.language, name: clubs[1].name.text, slug: clubs[1].slug }),
  ],
  ['by other name', otherName, Either.left(new ClubNotFound())],
])('with a club name (%s)', (_name, input, expected) => {
  const actual = _.GetClubByName(clubs)(input)

  expect(actual).toStrictEqual(expected)
})
