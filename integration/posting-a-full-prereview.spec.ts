import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { Record, RecordsC, SubmittedDepositionC, UnsubmittedDepositionC } from 'zenodo-ts'
import { expect, test } from './test'

test('can post a full PREreview', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1055805' as Doi,
    conceptrecid: 1055805,
    id: 1055806,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        {
          name: 'Josiah Carberry',
          orcid: '0000-0002-1825-0097' as Orcid,
        },
      ],
      description: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
      doi: '10.5072/zenodo.1055806' as Doi,
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
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [] } }) },
  )
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')

  await expect(page.locator('main')).toContainText('We will ask you to log in')
  await expect(page).toHaveScreenshot()

  fetch.postOnce('http://orcid.test/token', {
    status: Status.OK,
    body: {
      access_token: 'access-token',
      token_type: 'Bearer',
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097',
    },
  })
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.fill('text="Write your PREreview"', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  await page.check('text="Josiah Carberry"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  await page.check('text="I’m following the Code of Conduct"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  const preview = page.locator('role=blockquote[name="Check your PREreview"]')

  await expect(preview).toContainText('Josiah Carberry')
  await expect(preview).toContainText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await expect(page).toHaveScreenshot()

  fetch
    .postOnce('http://zenodo.test/api/deposit/depositions', {
      body: UnsubmittedDepositionC.encode({
        ...record,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
        },
        metadata: {
          ...record.metadata,
          communities: [{ identifier: 'prereview-reviews' }],
          prereserve_doi: {
            doi: record.metadata.doi,
          },
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
        ...record,
        metadata: {
          ...record.metadata,
          communities: [{ identifier: 'prereview-reviews' }],
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
    { body: RecordsC.encode({ hits: { hits: [record] } }) },
    { overwriteRoutes: true },
  )

  await page.click('text="Back to preprint"')

  const review = page.locator('main article').first()

  await expect(review).toContainText('Lorem ipsum dolor sit amet')
  await expect(review).toHaveScreenshot()
})

test('can post a full PREreview anonymously', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1055807' as Doi,
    conceptrecid: 1055807,
    id: 1055808,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      communities: [{ id: 'prereview-reviews' }],
      creators: [{ name: 'PREreviewer' }],
      description: '<p>Vestibulum nulla turpis, convallis a tincidunt at, pellentesque at nibh.</p>',
      doi: '10.5072/zenodo.1055808' as Doi,
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
          identifier: '10.5072/zenodo.1055807',
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
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [] } }) },
  )
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')

  fetch.postOnce('http://orcid.test/token', {
    status: Status.OK,
    body: {
      access_token: 'access-token',
      token_type: 'Bearer',
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097',
    },
  })
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.fill('text="Write your PREreview"', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.click('text="Next"')
  await page.check('text="PREreviewer"')
  await page.click('text="Next"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Next"')

  const preview = page.locator('role=blockquote[name="Check your PREreview"]')

  await expect(preview).toContainText('PREreviewer')
  await expect(preview).toContainText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

  fetch
    .postOnce('http://zenodo.test/api/deposit/depositions', {
      body: UnsubmittedDepositionC.encode({
        ...record,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
        },
        metadata: {
          ...record.metadata,
          communities: [{ identifier: 'prereview-reviews' }],
          prereserve_doi: {
            doi: record.metadata.doi,
          },
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
        ...record,
        metadata: {
          ...record.metadata,
          communities: [{ identifier: 'prereview-reviews' }],
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
  await expect(main).toContainText('Your DOI 10.5072/zenodo.1055808')

  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [record] } }) },
    { overwriteRoutes: true },
  )

  await page.click('text="Back to preprint"')

  const review = page.locator('main article').first()

  await expect(review).toContainText('Vestibulum nulla turpis')
})

test("aren't told about ORCID when already logged in", async ({ fetch, page }) => {
  await page.goto('/log-in')
  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')

  fetch.postOnce('http://orcid.test/token', {
    status: Status.OK,
    body: {
      access_token: 'access-token',
      token_type: 'Bearer',
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097',
    },
  })

  await page.keyboard.press('Enter')
  await page.locator('text=PREreview').waitFor()

  fetch.getOnce(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [] } }) },
  )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')

  await expect(page.locator('main')).not.toContainText('ORCID')
  await expect(page.locator('h1')).toContainText('Write your PREreview')
})

test('have to enter a review', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/review')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')

  fetch.postOnce('http://orcid.test/token', {
    status: Status.OK,
    body: {
      access_token: 'access-token',
      token_type: 'Bearer',
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097',
    },
  })
  await page.keyboard.press('Enter')

  await page.click('text="Next"')

  const error = page.locator('form:has([aria-invalid])')

  await expect(error).toContainText('Error: Enter your PREreview.')
  await expect(error).toHaveScreenshot()
})

test('have to choose a name', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/review')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  fetch.postOnce('http://orcid.test/token', {
    status: Status.OK,
    body: {
      access_token: 'access-token',
      token_type: 'Bearer',
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097',
    },
  })
  await page.keyboard.press('Enter')

  await page.fill('text="Write your PREreview"', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.click('text="Next"')

  await page.click('text="Next"')

  const error = page.locator('form:has([aria-invalid])')

  await expect(error).toContainText('Error: Select a name.')
  await expect(error).toHaveScreenshot()
})

test('have to agree to the Code of Conduct', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/review')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  fetch.postOnce('http://orcid.test/token', {
    status: Status.OK,
    body: {
      access_token: 'access-token',
      token_type: 'Bearer',
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097',
    },
  })
  await page.keyboard.press('Enter')

  await page.fill('text="Write your PREreview"', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')

  await page.click('text="Next"')

  const error = page.locator('form:has([aria-invalid])')

  await expect(error).toContainText('Error: Confirm that you are following the Code of Conduct.')
  await expect(error).toHaveScreenshot()
})
