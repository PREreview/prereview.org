import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Events from '../src/Domain/Events/index.ts'
import { BiorxivPreprintId } from '../src/Domain/Preprints/index.ts'
import { html } from '../src/html.ts'
import { Doi } from '../src/types/Doi.ts'
import { Name } from '../src/types/Name.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { Uuid } from '../src/types/Uuid.ts'
import { expect, seedEvents, test } from './base.ts'

const clubReview = ({ id, preprint, published }: { id: number; preprint: Doi; published: Temporal.PlainDate }) =>
  new Events.PreprintReviewImported({
    authors: [
      { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
    ],
    otherAuthors: 0,
    club: Uuid('3e820d44-fdb3-4cba-aeb6-ac03fb23108e'),
    doi: Doi(`10.5281/zenodo.${id}`),
    id,
    license: 'CC-BY-4.0',
    published,
    preprint: new BiorxivPreprintId({ value: preprint }),
    live: false,
    useOfAi: { _tag: 'NotAnswered' },
    competingInterests: { _tag: 'No' },
    language: 'en',
    content: { _tag: 'Full', text: html`<p>Some review.</p>` },
    topics: [],
  })

test.extend(
  seedEvents(
    clubReview({
      id: 7820084,
      preprint: Doi('10.1101/2022.01.13.476201'),
      published: Temporal.PlainDate.from('2023-04-12'),
    }),
    clubReview({
      id: 7747129,
      preprint: Doi('10.1101/2023.02.28.529746'),
      published: Temporal.PlainDate.from('2023-03-17'),
    }),
  ),
)('can find and view a Club', async ({ page }) => {
  await page.goto('/reviews/7820084', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'ASAPbio Metabolism Crowd' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ASAPbio Metabolism Crowd')
  await expect(
    page.getByRole('link', {
      name: 'Josiah Carberry reviewed The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', {
      name: 'Josiah Carberry reviewed A conserved local structural motif controls the kinetics of PTP1B catalysis',
    }),
  ).toBeVisible()
})

test('the list might be empty', async ({ page }) => {
  await page.goto('/clubs/asapbio-metabolism', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ASAPbio Metabolism Crowd')
  await expect(page.getByRole('main')).toContainText('ASAPbio Metabolism Crowd hasn’t published a PREreview yet.')
})
