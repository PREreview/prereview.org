import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { URL } from 'url'
import { RecordC, SubmittedDepositionC, UnsubmittedDepositionC } from 'zenodo-ts'
import { expect, test } from './test'

test('can post a full PREreview', async ({ fetch, page }) => {
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
    }),
  })

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')

  await page.fill('text=PREreview', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

  fetch
    .postOnce('http://zenodo.test/api/deposit/depositions', {
      body: UnsubmittedDepositionC.encode({
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
        },
        metadata: {
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          prereserve_doi: {
            doi: '10.5072/zenodo.1055806' as Doi,
          },
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'article',
        },
        state: 'unsubmitted',
        submitted: false,
      }),
      status: Status.Created,
    })
    .putOnce('http://example.com/bucket/review.txt', {
      status: Status.Created,
    })
    .postOnce('http://example.com/publish', {
      body: SubmittedDepositionC.encode({
        id: 1,
        metadata: {
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5072/zenodo.1055806' as Doi,
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'article',
        },
        state: 'done',
        submitted: true,
      }),
      status: Status.Accepted,
    })

  await page.click('text="Post PREreview"')

  const main = page.locator('main')
  const h1 = main.locator('h1')

  await expect(h1).toContainText('PREreview posted')
  await expect(main).toContainText('Your DOI 10.5072/zenodo.1055806')

  await page.click('text="Back to preprint"')

  test.fixme(true, 'PREreview does not appear')

  const review = page.locator('main article').first()

  await expect(review).toContainText('Lorem ipsum dolor sit amet')
})
