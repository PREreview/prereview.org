import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { Record, RecordsC, SubmittedDepositionC, UnsubmittedDepositionC } from 'zenodo-ts'
import { expect, test } from './test'

test('can post a full PREreview', async ({ fetch, javaScriptEnabled, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1055805' as Doi,
    conceptrecid: 1055805,
    files: [
      {
        links: {
          self: new URL('http://example.com/file'),
        },
        key: 'review.html',
        type: 'html',
        size: 58,
      },
    ],
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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
    await page.focus('role=textbox[name="Write your PREreview"]')
    await page.keyboard.type('Lorem ipsum dolor sit "amet", *consectetur* ')
    await page.keyboard.press('Control+b')
    await page.keyboard.type('adipiscing elit')
    await page.keyboard.press('Control+b')
    await page.keyboard.type('.')
  } else {
    await page.fill(
      'text="Write your PREreview"',
      'Lorem ipsum dolor sit "amet", *consectetur* <b>adipiscing elit</b>.',
    )
  }

  await page.evaluate(() => document.querySelector('html')?.setAttribute('spellcheck', 'false'))

  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  await page.check('text="Josiah Carberry"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  await page.check('text="No, only me"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  await page.check('text="I’m following the Code of Conduct"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  const preview = page.locator('role=blockquote[name="Check your PREreview"]')

  await expect(preview).toContainText('Josiah Carberry')
  if (javaScriptEnabled) {
    await expect(preview).toContainText('Lorem ipsum dolor sit “amet”, consectetur adipiscing elit.')
  } else {
    await expect(preview).toContainText('Lorem ipsum dolor sit "amet", consectetur adipiscing elit.')
  }
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
    .putOnce('http://example.com/bucket/review.html', {
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

test('can post a full PREreview with more authors', async ({ fetch, javaScriptEnabled, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1055807' as Doi,
    conceptrecid: 1055807,
    files: [
      {
        links: {
          self: new URL('http://example.com/file'),
        },
        key: 'review.html',
        type: 'html',
        size: 58,
      },
    ],
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
      publication_date: new Date('2022-07-05'),
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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')
  await page.check('text="Yes"')
  await page.click('text="Next"')

  await expect(page.locator('main')).toContainText('Add more authors')
  await expect(page).toHaveScreenshot()

  await page.click('text="Next"')

  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Next"')

  const preview = page.locator('role=blockquote[name="Check your PREreview"]')

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
    .putOnce('http://example.com/bucket/review.html', {
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
  await expect(main).toContainText('other authors’ details')
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

  await expect(review).toContainText('Vestibulum nulla turpis')
})

test('can post a full PREreview anonymously', async ({ fetch, javaScriptEnabled, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1055807' as Doi,
    conceptrecid: 1055807,
    files: [
      {
        links: {
          self: new URL('http://example.com/file'),
        },
        key: 'review.html',
        type: 'html',
        size: 58,
      },
    ],
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
      publication_date: new Date('2022-07-05'),
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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')
  await page.check('text="PREreviewer"')
  await page.click('text="Next"')
  await page.check('text="No, only me"')
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
    .putOnce('http://example.com/bucket/review.html', {
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

test('can change the review after previewing', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')

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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')
  await page.check('text="No, only me"')
  await page.click('text="Next"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Next"')

  await expect(page.locator('role=blockquote[name="Check your PREreview"]')).toContainText(
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )

  await page.click('text="Change PREreview"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
  )
  await page.click('text="Next"')

  await expect(page.locator('role=blockquote[name="Check your PREreview"]')).toContainText(
    'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
  )
})

test('can change publish-as name after previewing', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')

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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }

  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')
  await page.check('text="No, only me"')
  await page.click('text="Next"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Next"')

  await expect(page.locator('role=blockquote[name="Check your PREreview"]')).toContainText('Josiah Carberry')

  await page.click('text="Change name"')

  await page.check('text="PREreviewer"')
  await page.click('text="Next"')

  await expect(page.locator('role=blockquote[name="Check your PREreview"]')).toContainText('PREreviewer')
})

test('can go back through the form', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')

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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')
  await page.check('text="No, only me"')
  await page.click('text="Next"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Next"')

  await expect(page.locator('h1')).toContainText('Check your PREreview')

  await page.goBack()

  await expect(page.locator('text="I’m following the Code of Conduct"')).toBeChecked()

  await page.goBack()

  await expect(page.locator('text="No, only me"')).toBeChecked()

  await page.goBack()

  await expect(page.locator('text="Josiah Carberry"')).toBeChecked()

  await page.goBack()

  if (javaScriptEnabled) {
    await expect(page.locator('role=textbox[name="Write your PREreview"]')).toHaveText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )
  } else {
    await expect(page.locator('text="Write your PREreview"')).toHaveValue(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )
  }
})

test('see existing values when going back a step', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')

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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')
  await page.check('text="No, only me"')
  await page.click('text="Next"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Next"')

  await expect(page.locator('h1')).toContainText('Check your PREreview')

  await page.click('text="Back"')

  await expect(page.locator('text="I’m following the Code of Conduct"')).toBeChecked()

  await page.click('text="Back"')

  await expect(page.locator('text="No, only me"')).toBeChecked()

  await page.click('text="Back"')

  await expect(page.locator('text="Josiah Carberry"')).toBeChecked()

  await page.click('text="Back"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=textbox[name="Write your PREreview"]')).toHaveText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )
  } else {
    await expect(page.locator('text="Write your PREreview"')).toHaveValue(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )
  }
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
  await expect(page).toHaveTitle(/PREreview/)

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
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')
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

test('have to choose a name', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')
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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')

  await page.click('text="Next"')

  const error = page.locator('form:has([aria-invalid])')

  await expect(error).toContainText('Error: Select a name.')
  await expect(error).toHaveScreenshot()
})

test('have to say if there are more authors', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')
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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')

  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')

  await page.click('text="Next"')

  const error = page.locator('form:has([aria-invalid])')

  await expect(error).toContainText('Error: Select yes if someone else wrote the PREreview.')
  await expect(error).toHaveScreenshot()
})

test('have to agree to the Code of Conduct', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/prereview')
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

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Next"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Next"')
  await page.check('text="No, only me"')
  await page.click('text="Next"')

  await page.click('text="Next"')

  const error = page.locator('form:has([aria-invalid])')

  await expect(error).toContainText('Error: Confirm that you are following the Code of Conduct.')
  await expect(error).toHaveScreenshot()
})
