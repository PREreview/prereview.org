import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { Record, RecordsC, SubmittedDepositionC, UnsubmittedDepositionC } from 'zenodo-ts'
import { areLoggedIn, canLogIn, expect, test, updatesLegacyPrereview } from './test'

test.extend(canLogIn)(
  'can publish a PREreview',
  async ({ contextOptions, fetch, javaScriptEnabled, page }, testInfo) => {
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
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
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
    await page.getByRole('link', { name: 'Write a PREreview' }).click()

    await expect(page.getByRole('main')).toContainText('We will ask you to log in')
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Start now' }).click()

    await page.locator('[type=email]').fill('test@example.com')
    await page.locator('[type=password]').fill('password')
    await page.keyboard.press('Enter')

    await page.getByLabel('No').check()

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your PREreview')).toHaveText(/^Write a short summary of/)
    } else {
      await expect(page.getByLabel('Write your PREreview')).toHaveValue(/^Write a short summary of/)
    }

    await expect(page).toHaveScreenshot()

    if (javaScriptEnabled) {
      await page.getByLabel('Write your PREreview').clear()
      await page.keyboard.type('Lorem ipsum dolor sit "amet", *consectetur* ')
      await page.keyboard.press('Control+b')
      await page.keyboard.type('adipiscing elit')
      await page.keyboard.press('Control+b')
      await page.keyboard.type('.')
    } else {
      await page
        .getByLabel('Write your PREreview')
        .fill('Lorem ipsum dolor sit "amet", *consectetur* <b>adipiscing elit</b>.')
    }

    await page.evaluate(() => document.querySelector('html')?.setAttribute('spellcheck', 'false'))

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Josiah Carberry').check()

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('No, I reviewed it alone').check()

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('No').check()

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('I’m following the Code of Conduct').check()

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    const preview = page.getByRole('blockquote', { name: 'Check your PREreview' })

    await expect(preview).toContainText('Josiah Carberry')
    if (javaScriptEnabled) {
      await expect(preview).toContainText('Lorem ipsum dolor sit “amet”, consectetur adipiscing elit.')
    } else {
      await expect(preview).toContainText('Lorem ipsum dolor sit "amet", consectetur adipiscing elit.')
    }
    await expect(preview).toContainText('The author declares that they have no competing interests.')
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
            publication_type: 'peerreview',
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
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: Status.Accepted,
      })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'are logged out after publishing',
  async ({ fetch, javaScriptEnabled, page }) => {
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
        creators: [{ name: 'Orange Panda' }],
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
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
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
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but they don’t want to be listed as authors').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

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
            publication_type: 'peerreview',
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
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: Status.Accepted,
      })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')

    await page.goBack()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Write a PREreview')
    await expect(page.getByRole('main')).toContainText('We will ask you to log in')
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can skip to the forms', async ({ fetch, javaScriptEnabled, page }) => {
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
        subtype: 'peerreview',
      },
      title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
    },
  }

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Start now' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
    await page.locator('[contenteditable]').waitFor()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()

  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
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
          publication_type: 'peerreview',
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
          publication_type: 'peerreview',
        },
        state: 'done',
        submitted: true,
      }),
      status: Status.Accepted,
    })

  await page.getByRole('button', { name: 'Publish PREreview' }).click()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})

test.extend(updatesLegacyPrereview).extend(canLogIn).extend(areLoggedIn)(
  'updates the legacy PREreview',
  async ({ fetch, javaScriptEnabled, page }) => {
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
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
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
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }

    await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

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
            publication_type: 'peerreview',
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
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: Status.Accepted,
      })
      .getOnce('http://prereview.test/api/v2/resolve?identifier=10.1101/2022.01.13.476201', {
        body: {
          uuid: 'e7d28fbe-013a-4987-9faa-7f44a9f7683a',
        },
      })
      .postOnce(
        {
          url: 'http://prereview.test/api/v2/full-reviews',
          headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
        },
        { status: Status.Created },
      )

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can paste an already-written PREreview',
  async ({ browserName, context, contextOptions, fetch, javaScriptEnabled, page }, testInfo) => {
    fetch.get(
      {
        url: 'http://zenodo.test/api/records/',
        query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
      },
      { body: RecordsC.encode({ hits: { hits: [] } }) },
    )
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Paste your PREreview')
    await expect(page).toHaveScreenshot()

    const newPage = await context.newPage()
    await newPage.setContent(`<div contenteditable>
      <h1>Lorem ipsum</h1>
      <div>
        <p>Dolor sit amet, consectetur <strong>adipiscing</strong> <em>elit</em>.</p>
        <ul>
          <li>
            Sed id nibh in felis porta ultricies.
          </li>
          <li>
            <ol>
              <li>Praesent aliquet velit non nibh luctus imperdiet.</li>
            </ol>
          </li>
        </ul>
      </div>
    </div>`)
    await newPage.locator('[contenteditable]').selectText()
    await newPage.keyboard.press('Control+C')
    await newPage.close()

    await page.getByLabel('Paste your PREreview').focus()
    await page.keyboard.press('Control+V')

    if (javaScriptEnabled) {
      testInfo.fail(browserName === 'firefox', 'https://github.com/microsoft/playwright/issues/18339')

      await expect(page.getByLabel('Paste your PREreview').getByRole('heading', { level: 1 })).toHaveText('Lorem ipsum')
      await expect(page.getByLabel('Paste your PREreview').getByRole('listitem')).toHaveText([
        'Sed id nibh in felis porta ultricies.',
        'Praesent aliquet velit non nibh luctus imperdiet.',
      ])
    } else {
      await expect(page.getByLabel('Paste your PREreview')).toHaveValue(/Lorem ipsum/)
    }

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can format a PREreview',
  async ({ browserName, contextOptions, fetch, javaScriptEnabled, page }, testInfo) => {
    fetch.get(
      {
        url: 'http://zenodo.test/api/records/',
        query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
      },
      { body: RecordsC.encode({ hits: { hits: [] } }) },
    )
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByLabel('Write your PREreview').waitFor()
    await page.evaluate(() => document.querySelector('html')?.setAttribute('spellcheck', 'false'))

    if (!javaScriptEnabled) {
      await expect(page.getByRole('button', { name: 'Bold' })).toBeHidden()

      return
    }
    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await page.locator('[contenteditable]').waitFor()
    await page.getByLabel('Write your PREreview').clear()

    await page.getByRole('button', { name: 'Heading level 1' }).click()
    await expect(page.getByRole('button', { name: 'Heading level 1' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    if (browserName === 'webkit') {
      await page.getByLabel('Write your PREreview').scrollIntoViewIfNeeded()
    }

    await page.keyboard.type('Lorem')
    await expect(page).toHaveScreenshot()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('button', { name: 'Heading level 1' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.type('Ipsum')
    await page.getByRole('button', { name: 'Heading level 3' }).click()
    await page.getByRole('button', { name: 'Heading level 2' }).click()
    await expect(page.getByRole('button', { name: 'Heading level 3' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Heading level 2' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.press('Enter')

    await expect(page.getByRole('button', { name: 'Heading level 2' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.type('Dolor sit ')
    await page.keyboard.press('ArrowLeft')

    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-disabled', 'true')

    await page.keyboard.press('Shift+ArrowLeft')

    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-disabled', 'false')

    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft')

    page.once('dialog', dialog => {
      void dialog.accept('https://example.com')
    })
    await page.getByRole('button', { name: 'Link' }).click()

    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Link' }).click()

    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('ArrowDown')
    await page.keyboard.type('"amet", ')

    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Link' })).toBeFocused()

    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: 'Numbered list' })).toBeFocused()

    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: 'Italic' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.type('consectetur')

    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Italic' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.type(' ')

    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.type('adipiscing ')

    await page.getByRole('button', { name: 'Subscript' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Subscript' })).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.type('el')

    await page.getByRole('button', { name: 'Superscript' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Subscript' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.type('it')

    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Superscript' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.type('.')

    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await page.getByRole('button', { name: 'Bulleted list' }).click()

    await page.keyboard.type('Mauris')
    await page.keyboard.press('Enter')
    await page.keyboard.type('In ante')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.keyboard.type('turpis')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Numbered list' }).click()
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Numbered list' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can publish a PREreview with more authors',
  async ({ fetch, javaScriptEnabled, page }) => {
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
        creators: [{ name: 'Orange Panda' }],
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
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
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
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, and some or all want to be listed as authors').check()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Add more authors')
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('blockquote', { name: 'Check your PREreview' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

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
            publication_type: 'peerreview',
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
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: Status.Accepted,
      })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055808')
    await expect(page.getByRole('main')).toContainText('other authors’ details')
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  "can publish a PREreview with more authors who don't want to be listed as authors",
  async ({ fetch, javaScriptEnabled, page }) => {
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
        creators: [{ name: 'Orange Panda' }],
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
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
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
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but they don’t want to be listed as authors').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('blockquote', { name: 'Check your PREreview' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

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
            publication_type: 'peerreview',
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
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: Status.Accepted,
      })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055808')
    await expect(page.getByRole('main')).not.toContainText('other authors’ details')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can publish a PREreview with competing interests',
  async ({ contextOptions, fetch, javaScriptEnabled, page }, testInfo) => {
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
        creators: [{ name: 'Orange Panda' }],
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
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
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
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes').check()
    await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const preview = page.getByRole('blockquote', { name: 'Check your PREreview' })

    await expect(preview).toContainText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await expect(preview).toContainText('Maecenas sed dapibus massa.')
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
            publication_type: 'peerreview',
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
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: Status.Accepted,
      })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055808')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can publish a PREreview using a pseudonym',
  async ({ fetch, javaScriptEnabled, page }) => {
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
        creators: [{ name: 'Orange Panda' }],
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
          subtype: 'peerreview',
        },
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
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
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const preview = page.getByRole('blockquote', { name: 'Check your PREreview' })

    await expect(preview).toContainText('Orange Panda')
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
            publication_type: 'peerreview',
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
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }),
        status: Status.Accepted,
      })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055808')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can change the review after previewing',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('blockquote', { name: 'Check your PREreview' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

    await page.getByRole('link', { name: 'Change PREreview' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page
      .getByLabel('Write your PREreview')
      .fill('Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('blockquote', { name: 'Check your PREreview' })).toContainText(
      'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can change the name after previewing',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('blockquote', { name: 'Check your PREreview' })).toContainText('Josiah Carberry')

    await page.getByRole('link', { name: 'Change name' }).click()

    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('blockquote', { name: 'Check your PREreview' })).toContainText('Orange Panda')
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can go back through the form', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

  await page.goBack()

  await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('No')).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('No, I reviewed it alone')).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

  await page.goBack()

  if (javaScriptEnabled) {
    await expect(page.getByLabel('Write your PREreview')).toHaveText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )
  } else {
    await expect(page.getByLabel('Write your PREreview')).toHaveValue(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )
  }

  await page.goBack()

  await expect(page.getByLabel('No')).toBeChecked()

  await page.goBack()

  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'see existing values when going back a step',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No, I reviewed it alone')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your PREreview')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Write your PREreview')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Paste your PREreview')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Paste your PREreview')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  "aren't told about ORCID when already logged in",
  async ({ fetch, javaScriptEnabled, page }) => {
    fetch.getOnce(
      {
        url: 'http://zenodo.test/api/records/',
        query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
      },
      { body: RecordsC.encode({ hits: { hits: [] } }) },
    )

    await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
    await page.getByRole('link', { name: 'Write a PREreview' }).click()

    await expect(page.getByRole('main')).not.toContainText('ORCID')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Have you already written your PREreview?')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a PREreview',
  async ({ fetch, javaScriptEnabled, page }) => {
    fetch.get(
      {
        url: 'http://zenodo.test/api/records/',
        query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
      },
      { body: RecordsC.encode({ hits: { hits: [] } }) },
    )
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('link', { name: 'Back' }).click()
    await page.getByRole('link', { name: 'Back to preprint' }).click()
    await page.getByRole('link', { name: 'Write a PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your PREreview')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step after logging in if you have already started a PREreview',
  async ({ fetch, javaScriptEnabled, page }) => {
    fetch.get(
      {
        url: 'http://zenodo.test/api/records/',
        query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
      },
      { body: RecordsC.encode({ hits: { hits: [] } }) },
    )
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
    await page.getByRole('link', { name: 'Write a PREreview' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.goto('/log-out')
    await page.goBack()
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.locator('[type=email]').fill('test@example.com')
    await page.locator('[type=password]').fill('password')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your PREreview')
  },
)

test.extend(canLogIn)('have to grant access to your ORCID iD', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  const [redirectUri, state] = await Promise.all([
    page.locator('[name=redirectUri]').inputValue(),
    page.locator('[name=state]').inputValue(),
  ])
  await page.goto(`${new URL(redirectUri).pathname}?error=access_denied&state=${state}`)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we can’t log you in')
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

test('are told if ORCID is unavailable', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')

  fetch.postOnce('http://orcid.test/token', { status: Status.ServiceUnavailable })
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
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

test('might not authenticate with ORCID in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')

  fetch.postOnce(
    'http://orcid.test/token',
    new Promise(() =>
      setTimeout(
        () => ({
          status: Status.OK,
          body: {
            access_token: 'access-token',
            token_type: 'Bearer',
            name: 'Josiah Carberry',
            orcid: '0000-0002-1825-0097',
          },
        }),
        2000,
      ),
    ),
  )
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
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

test.extend(canLogIn).extend(areLoggedIn)(
  'are told if Zenodo is unavailable',
  async ({ fetch, javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    fetch.postOnce('http://zenodo.test/api/deposit/depositions', { status: Status.ServiceUnavailable })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn)('mind not find the pseudonym in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')

  fetch.get(
    {
      url: 'http://prereview.test/api/v2/users/0000-0002-1825-0097',
      headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
    },
    new Promise(() =>
      setTimeout(
        () => ({
          status: Status.NotFound,
        }),
        2000,
      ),
    ),
    { overwriteRoutes: true },
  )
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
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

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if you have already written your PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByRole('group', { name: 'Have you already written your PREreview?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select yes if you have already written your PREreview' }).click()

    await expect(page.getByLabel('No')).toBeFocused()
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to enter a review',
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }

    await page.getByLabel('Write your PREreview').clear()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByLabel('Write your PREreview')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter your PREreview' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  "can't use the template as the review",
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByLabel('Write your PREreview')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter your PREreview' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to paste a review',
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByLabel('Paste your PREreview')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Paste your PREreview' }).click()

    await expect(page.getByLabel('Paste your PREreview')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to choose a name', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
  }
  await expect(page.getByRole('group', { name: 'What name would you like to use?' })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page).toHaveScreenshot()

  await page.getByRole('link', { name: 'Select the name that you would like to use' }).click()

  await expect(page.getByLabel('Josiah Carberry')).toBeFocused()
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if there are more authors',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByRole('group', { name: 'Did you review this preprint with anyone else?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select yes if you reviewed the preprint with someone else' }).click()

    await expect(page.getByLabel('No, I reviewed it alone')).toBeFocused()
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say that the other authors have read and approved the PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes, and some or all want to be listed as authors').click()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByLabel('They have read and approved the PREreview')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveScreenshot()

    await page
      .getByRole('link', { name: 'Confirm that the other authors have read and approved the PREreview' })
      .click()

    await expect(page.getByLabel('They have read and approved the PREreview')).toBeFocused()
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to declare any competing interests',
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByRole('group', { name: 'Do you have any competing interests?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select yes if you have any competing interests' }).click()

    await expect(page.getByLabel('No')).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Yes').check()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByLabel('What are they?')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter details of your competing interests' }).click()

    await expect(page.getByLabel('What are they?')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to agree to the Code of Conduct',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
    }
    await expect(page.getByRole('group', { name: 'Code of Conduct' })).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Confirm that you are following the Code of Conduct' }).click()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeFocused()
    await expect(page).toHaveScreenshot()
  },
)
