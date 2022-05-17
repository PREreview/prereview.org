import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { SubmittedDepositionC, UnsubmittedDepositionC } from 'zenodo-ts'
import { expect, test } from './test'

test('can post a full PREreview', async ({ fetch, page }) => {
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
