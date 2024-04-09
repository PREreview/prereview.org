import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { RecordsC } from 'zenodo-ts'
import { expect, test } from './base'

test('can find and view a preprint', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')

  fetch
    .getOnce(
      {
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
      },
      {
        body: RecordsC.encode({
          hits: {
            total: 1,
            hits: [
              {
                conceptdoi: '10.5072/zenodo.1061863' as Doi,
                conceptrecid: 1061863,
                files: [
                  {
                    links: {
                      self: new URL('http://example.com/review.html/content'),
                    },
                    key: 'review.html',
                    size: 58,
                  },
                ],
                id: 1061864,
                links: {
                  latest: new URL('http://example.com/latest'),
                  latest_html: new URL('http://example.com/latest_html'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [
                    { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
                    { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
                    { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
                    { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
                    { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
                    { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
                  ],
                  description:
                    '<p>The manuscript &quot;The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>&quot; by Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in <em>Chlamydomonas reinhardtii</em>. The Chlamydomonas mutant lacking LHCBM1 (<em>npq5</em>) displays a low NPQ phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower NPQ phenotype in <em>npq5</em>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ induction and found that <em>npq5 </em>NPQ is still low. They propose that absence of LHCBM1 could alter the association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.</p>',
                  doi: '10.5281/zenodo.1061864' as Doi,
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2022-07-05'),
                  related_identifiers: [
                    {
                      identifier: '10.1101/2022.01.13.476201',
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                      scheme: 'doi',
                    },
                    {
                      identifier: '10.5072/zenodo.1061863',
                      relation: 'isVersionOf',
                      scheme: 'doi',
                    },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'peerreview',
                  },
                  title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
                },
              },
            ],
          },
        }),
      },
    )
    .getOnce('http://example.com/review.html/content', {
      body: '<h1>Some title</h1><p>The manuscript &quot;The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>&quot; by Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in <em>Chlamydomonas reinhardtii</em>. The Chlamydomonas mutant lacking LHCBM1 (<em>npq5</em>) displays a low NPQ phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower NPQ phenotype in <em>npq5</em>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ induction and found that <em>npq5 </em>NPQ is still low. They propose that absence of LHCBM1 could alter the association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.</p>',
    })

  await page.getByRole('link', { name: 'Back to preprint' }).click()

  await expect(
    page
      .getByRole('complementary', { name: 'Preprint details' })
      .getByRole('article', { name: 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' }),
  ).toContainText('Non-photochemical quenching (NPQ) is the process that protects')
  await expect(page.getByRole('main')).toContainText('1 PREreview')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test('might not load PREreviews in time', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    new Promise(() => setTimeout(() => ({ body: RecordsC.encode({ hits: { total: 0, hits: [] } }) }), 2000)),
  )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})
