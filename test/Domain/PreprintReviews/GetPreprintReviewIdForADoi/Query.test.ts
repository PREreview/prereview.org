import { Temporal } from '@js-temporal/polyfill'
import { Array, Result } from 'effect'
import * as _ from '../../../../src/Domain/PreprintReviews/GetPreprintReviewIdForADoi/Query.ts'
import { PrereviewIsNotFound } from '../../../../src/Domain/PreprintReviews/GetPreprintReviewIdForADoi/Types.ts'
import { BiorxivOrMedrxivPreprintId } from '../../../../src/Domain/Preprints/index.ts'
import * as Events from '../../../../src/Events.ts'
import { html } from '../../../../src/html.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { OrcidId } from '../../../../src/types/OrcidId.ts'
import { expect, test } from '../../../vitest.ts'

const input = Doi('10.5281/zenodo.12345') satisfies _.Input

const imported = new Events.PreprintReviewImported({
  authors: [{ _tag: 'PseudonymPersona', orcidId: OrcidId('0000-0002-1825-0097') }],
  otherAuthors: 0,
  doi: input,
  id: 12345,
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

const importedWithDifferentCase = new Events.PreprintReviewImported({
  ...imported,
  doi: Doi('10.5281/ZENODO.12345'),
})

const importedOtherReview = new Events.PreprintReviewImported({
  ...imported,
  doi: Doi('10.5281/zenodo.67890'),
  id: 67890,
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, Result.Result<_.Result, PrereviewIsNotFound>]>([
  ['no events', input, [], Result.fail(new PrereviewIsNotFound())],
  ['imported', input, [imported], Result.succeed(12345)],
  ['imported, DOI in a different case', input, [importedWithDifferentCase], Result.succeed(12345)],
  ['input in a different case', Doi('10.5281/ZENODO.12345'), [imported], Result.succeed(12345)],
  ['other review imported', input, [importedOtherReview], Result.fail(new PrereviewIsNotFound())],
  ['both imported', input, [importedOtherReview, imported], Result.succeed(12345)],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.Query

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})
