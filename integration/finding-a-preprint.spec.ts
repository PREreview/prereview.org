import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Events from '../src/Domain/Events/index.ts'
import { BiorxivPreprintId } from '../src/Domain/Preprints/index.ts'
import { html } from '../src/html.ts'
import { Doi } from '../src/types/Doi.ts'
import { Name } from '../src/types/Name.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { expect, seedEvents, test } from './base.ts'

test.extend(
  seedEvents(
    new Events.PreprintReviewImported({
      authors: [
        { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
      ],
      otherAuthors: 0,
      doi: Doi('10.5281/zenodo.1061864'),
      id: 1061864,
      license: 'CC-BY-4.0',
      published: Temporal.PlainDate.from('2022-07-05'),
      preprint: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
      live: false,
      useOfAi: { _tag: 'NotAnswered' },
      competingInterests: { _tag: 'NotAnswered' },
      language: 'en',
      content: {
        _tag: 'Full',
        text: html`<h1>Some title</h1>
          <p>
            The manuscript “The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>” by
            Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in
            <em>Chlamydomonas reinhardtii</em>.
          </p>`,
      },
      topics: [],
    }),
  ),
)('can find and view a preprint', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'Back to preprint' }).click()

  await expect(
    page
      .getByRole('complementary', { name: 'Preprint details' })
      .getByRole('article', { name: 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' }),
  ).toContainText('Non-photochemical quenching (NPQ) is the process that protects')
  await expect(page.getByRole('main')).toContainText('1 PREreview')
})
