import { Doi } from 'doi-ts'
import { URL } from 'url'
import { RecordC, RecordsC } from 'zenodo-ts'
import { expect, test } from './test'

test('can find and view a review', async ({ fetch, page }) => {
  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    {
      body: RecordsC.encode({
        hits: {
          hits: [
            {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                communities: [{ id: 'prereview-reviews' }],
                creators: [
                  { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' },
                  { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' },
                  { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' },
                  { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' },
                  { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' },
                  { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' },
                ],
                description:
                  '<p>The manuscript &quot;The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>&quot; by Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in <em>Chlamydomonas reinhardtii</em>. The Chlamydomonas mutant lacking LHCBM1 (<em>npq5</em>) displays a low NPQ phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower NPQ phenotype in <em>npq5</em>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ induction and found that <em>npq5 </em>NPQ is still low. They propose that absence of LHCBM1 could alter the association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.</p>',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: {
                  id: 'CC-BY-4.0',
                },
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
                  subtype: 'article',
                },
                title: 'Review of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
              },
            },
          ],
        },
      }),
    },
  )

  fetch.get('http://zenodo.test/api/records/1061864', {
    body: RecordC.encode({
      conceptdoi: '10.5072/zenodo.1061863' as Doi,
      conceptrecid: 1061863,
      id: 1061864,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        communities: [{ id: 'prereview-reviews' }],
        creators: [
          { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' },
          { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' },
          { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' },
          { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' },
          { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' },
          { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: '10.5281/zenodo.1061864' as Doi,
        license: {
          id: 'CC-BY-4.0',
        },
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
          subtype: 'article',
        },
        title: 'Review of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
      },
    }),
  })

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text=Read the review by Jingfang Hao et al')

  const review = page.locator('main')

  await expect(review).toContainText('This work enriches the knowledge')
  await expect(page).toHaveScreenshot()
})
