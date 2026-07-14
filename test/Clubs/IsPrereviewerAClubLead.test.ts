import { expect, it } from '@effect/vitest'
import type { Array } from 'effect'
import * as _ from '../../src/Clubs/IsPrereviewerAClubLead.ts'
import type { ClubDetails } from '../../src/Clubs/index.ts'
import { html } from '../../src/html.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Slug } from '../../src/types/Slug.ts'
import { PlainDate } from '../../src/types/Temporal.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const orcidId1Club = OrcidId('0000-0002-1825-0097')
const orcidId2Clubs = OrcidId('0000-0003-4921-6155')
const orcidId0Clubs = OrcidId('0000-0002-6109-0367')

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
    leads: [orcidId1Club, orcidId2Clubs],
  },
  {
    id: Uuid('26a8ce99-8c88-4874-bfe6-71324b8970c9'),
    name: {
      language: 'en',
      text: Name('Villains Club'),
    },
    slug: Slug('villains-club'),
    description: {
      language: 'en',
      text: html`<p>Some text.</p>`,
    },
    added: PlainDate.from('2025-01-02'),
    leads: [orcidId2Clubs],
  },
] satisfies Array.NonEmptyReadonlyArray<ClubDetails>

it.each<[string, _.Input, _.Result]>([
  ['1 club', orcidId1Club, true],
  ['2 clubs', orcidId2Clubs, true],
  ['0 clubs', orcidId0Clubs, false],
])('with a club name (%s)', (_name, input, expected) => {
  const actual = _.IsPreviewerAClubLead(clubs)(input)

  expect(actual).toStrictEqual(expected)
})
