import { expect, test } from '../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Result, Option } from 'effect'
import * as _ from '../../src/PreprintReviews/ImportPreprintReview.ts'
import * as Events from '../../src/Events.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { Name } from '../../src/types/Name.ts'
import { BiorxivOrMedrxivPreprintId, BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { html } from '../../src/html.ts'

const input = {
  authors: [
    { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
  ],
  otherAuthors: 0,
  doi: Doi('10.5281/zenodo.12345'),
  id: 12345,
  license: 'CC-BY-4.0',
  published: Temporal.Now.instant(),
  preprint: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/abcde') }),
  live: false,
  useOfAi: { _tag: 'No' },
  competingInterests: { _tag: 'No' },
  language: 'en',
  content: { _tag: 'FreeText', text: html`<p>Hello</p>` },
} satisfies _.Input

const inputWithDifferentClub = {
  ...input,
  club: Uuid('793fb45f-c562-483a-a779-f0d0cfa6cb76'),
} satisfies _.Input

const inputWithDeterminatePreprintId = {
  ...input,
  preprint: new BiorxivPreprintId({ value: Doi('10.1101/abcde') }),
} satisfies _.Input

const inputWithDifferentAuthorList = {
  ...input,
  authors: [
    { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
    { _tag: 'PseudonymPersona', orcidId: OrcidId('0000-0002-6109-0367') },
  ],
} satisfies _.Input

const inputWithDifferentAddendum = {
  ...input,
  addendum: html`<p>PS: foo</p>`,
} satisfies _.Input

const imported = new Events.PreprintReviewImported(input)

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Result.Result<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Result.succeedSome(imported)],
  [
    'input with determinate ID stored with indeterminate ID',
    [],
    inputWithDeterminatePreprintId,
    Result.succeedSome(imported),
  ],
  ['already import with same data', [imported], input, Result.succeedNone],
  [
    'already imported with different club',
    [imported],
    inputWithDifferentClub,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'club' })),
  ],
  [
    'already imported with different author list',
    [imported],
    inputWithDifferentAuthorList,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'authors' })),
  ],
  [
    'already imported with different addendum',
    [imported],
    inputWithDifferentAddendum,
    Result.fail(new _.UnexpectedPreviousImport({ difference: 'addendum' })),
  ],
  ['already imported with indeterminate preprint ID', [imported], inputWithDeterminatePreprintId, Result.succeedNone],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ImportPreprintReview

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
