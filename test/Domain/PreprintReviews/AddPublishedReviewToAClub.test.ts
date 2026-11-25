import { Temporal } from '@js-temporal/polyfill'
import { Option, Result } from 'effect'
import * as Events from '../../../src/Domain/Events/Events.ts'
import * as _ from '../../../src/Domain/PreprintReviews/AddPublishedReviewToAClub.ts'
import * as PreprintReviews from '../../../src/Domain/PreprintReviews/index.ts'
import { BiorxivOrMedrxivPreprintId } from '../../../src/Domain/Preprints/index.ts'
import { html } from '../../../src/html.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../vitest.ts'

const input = {
  preprintReviewId: 12345,
  clubId: Uuid('13e21570-0d1a-47f0-b378-b8c20776496a'),
} satisfies _.Input

const inputUnknownClub = {
  preprintReviewId: 12345,
  clubId: Uuid('808aaad0-00ee-4c40-9880-4128ea8d1201'),
} satisfies _.Input

const otherClubId = Uuid('d3e62606-0367-44b9-8d52-b75e0e7e5ba7')

const imported = new Events.PreprintReviewImported({
  authors: [{ _tag: 'PseudonymPersona', orcidId: OrcidId('0000-0002-1825-0097') }],
  otherAuthors: 0,
  doi: Doi('10.5281/zenodo.12345'),
  id: input.preprintReviewId,
  license: 'CC-BY-4.0',
  published: Temporal.Instant.from('2026-11-10T12:00:00Z'),
  preprint: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/abcde') }),
  live: false,
  useOfAi: { _tag: 'No' },
  competingInterests: { _tag: 'No' },
  language: 'en',
  content: { _tag: 'Full', text: html`<p>Hello</p>` },
  topics: [],
})

const importedInTheClub = new Events.PreprintReviewImported({ ...imported, club: input.clubId })

const importedInADifferentClub = new Events.PreprintReviewImported({ ...imported, club: otherClubId })

const importedOtherReview = new Events.PreprintReviewImported({ ...imported, id: 67890 })

const added = new Events.PreprintReviewWasAddedToAClub({
  preprintReviewId: input.preprintReviewId,
  clubId: input.clubId,
})

const addedDifferentClub = new Events.PreprintReviewWasAddedToAClub({
  preprintReviewId: input.preprintReviewId,
  clubId: otherClubId,
})

const clubs = [input.clubId, otherClubId]

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Result.Result<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Result.fail(new PreprintReviews.PreprintReviewNotFound({}))],
  ['a different review', [importedOtherReview], input, Result.fail(new PreprintReviews.PreprintReviewNotFound({}))],
  ['not in a club', [imported], input, Result.succeed(Option.some(added))],
  ['unknown club', [imported], inputUnknownClub, Result.fail(new PreprintReviews.UnknownClub())],
  ['imported in the club', [importedInTheClub], input, Result.succeed(Option.none())],
  [
    'imported in a different club',
    [importedInADifferentClub],
    input,
    Result.fail(new PreprintReviews.PreprintReviewHasAlreadyBeenAddedToAClub()),
  ],
  ['already added to the club', [imported, added], input, Result.succeed(Option.none())],
  [
    'already added to a different club',
    [imported, addedDifferentClub],
    input,
    Result.fail(new PreprintReviews.PreprintReviewHasAlreadyBeenAddedToAClub()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.AddPublishedReviewToAClub(clubs)

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
