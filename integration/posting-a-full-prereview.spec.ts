import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { URL } from 'url'
import { RecordsC, SubmittedDepositionC, UnsubmittedDepositionC } from 'zenodo-ts'
import { expect, test } from './test'

test('can post a full PREreview', async ({ fetch, page }) => {
  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    {
      body: RecordsC.encode({
        hits: {
          hits: [],
        },
      }),
    },
  )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')

  await page.fill('text=PREreview', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

  await expect(page).toHaveScreenshot()

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
  await expect(page).toHaveScreenshot()

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
                creators: [{ name: 'PREreviewer' }],
                description: 'Lorem ipsum dolor sit amet',
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
                title: 'Review of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
              },
            },
          ],
        },
      }),
    },
    { overwriteRoutes: true },
  )

  await page.click('text="Back to preprint"')

  const review = page.locator('main article').first()

  await expect(review).toContainText('Lorem ipsum dolor sit amet')
  await expect(review).toHaveScreenshot()
})
