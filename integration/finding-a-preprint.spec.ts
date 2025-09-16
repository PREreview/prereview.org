import { Doi } from 'doi-ts'
import { Duration } from 'effect'
import { URL } from 'url'
import { RecordsC } from 'zenodo-ts'
import { OrcidId } from '../src/types/OrcidId.js'
import { expect, test } from './base.js'

test('can find and view a preprint', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })

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
                conceptdoi: Doi('10.5072/zenodo.1061863'),
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
                    { name: 'Jingfang Hao', orcid: OrcidId('0000-0003-4436-3420') },
                    { name: 'Pierrick Bru', orcid: OrcidId('0000-0001-5854-0905') },
                    { name: 'Alizée Malnoë', orcid: OrcidId('0000-0002-8777-3174') },
                    { name: 'Aurélie Crepin', orcid: OrcidId('0000-0002-4754-6823') },
                    { name: 'Jack Forsman', orcid: OrcidId('0000-0002-5111-8901') },
                    { name: 'Domenica Farci', orcid: OrcidId('0000-0002-3691-2699') },
                  ],
                  description:
                    '<p>The manuscript &quot;The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>&quot; by Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in <em>Chlamydomonas reinhardtii</em>. The Chlamydomonas mutant lacking LHCBM1 (<em>npq5</em>) displays a low NPQ phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower NPQ phenotype in <em>npq5</em>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ induction and found that <em>npq5 </em>NPQ is still low. They propose that absence of LHCBM1 could alter the association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.</p>',
                  doi: Doi('10.5281/zenodo.1061864'),
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
})

test('might not load PREreviews in time', async ({ fetch, page }) => {
  fetch.getOnce(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
