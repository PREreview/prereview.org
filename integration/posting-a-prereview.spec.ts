import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { Record, RecordsC, SubmittedDepositionC, UnsubmittedDepositionC } from 'zenodo-ts'
import { canLogIn, expect, test, updatesLegacyPrereview } from './test'

test.extend(canLogIn)('can post a PREreview', async ({ fetch, javaScriptEnabled, page }) => {
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
  await page.click('text="Write a PREreview"')

  await expect(page.locator('main')).toContainText('We will ask you to log in')
  await expect(page).toHaveScreenshot()

  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }

  if (javaScriptEnabled) {
    await expect(page.locator('role=textbox[name="Write your PREreview"]')).toHaveText(/^Write a short summary of/)
  } else {
    await expect(page.locator('role=textbox[name="Write your PREreview"]')).toHaveValue(/^Write a short summary of/)
  }

  await expect(page).toHaveScreenshot()

  if (javaScriptEnabled) {
    await page.locator('role=textbox[name="Write your PREreview"]').clear()
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

  await page.click('text="Save and continue"')

  await page.check('text="Josiah Carberry"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Save and continue"')

  await page.check('text="No, by myself"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Save and continue"')

  await page.check('text="No"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Save and continue"')

  await page.check('text="I’m following the Code of Conduct"')

  await expect(page).toHaveScreenshot()

  await page.click('text="Save and continue"')

  const preview = page.locator('role=blockquote[name="Check your PREreview"]')

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

  await page.click('text="Post PREreview"')

  const main = page.locator('main')
  const h1 = main.locator('h1')

  await expect(h1).toContainText('PREreview posted')
  await expect(main).toContainText('Your DOI 10.5072/zenodo.1055806')
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('can skip to the forms', async ({ fetch, javaScriptEnabled, page }) => {
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

  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await expect(page).toHaveTitle(/PREreview/)

  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.check('text="No"')
  await page.click('text="Continue"')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.click('text="Save and continue"')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()

  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')
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

  await page.click('text="Post PREreview"')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})

test.extend(updatesLegacyPrereview).extend(canLogIn)(
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
    await page.click('text="Write a PREreview"')

    await expect(page.locator('main')).toContainText('We will ask you to log in')

    await page.click('text="Start now"')

    await page.fill('[type=email]', 'test@example.com')
    await page.fill('[type=password]', 'password')
    await page.keyboard.press('Enter')

    await page.check('text="No"')
    await page.click('text="Continue"')

    if (javaScriptEnabled) {
      await page.locator('[contenteditable]').waitFor()
    }

    await page.fill('role=textbox[name="Write your PREreview"]', 'Lorem ipsum')
    await page.click('text="Save and continue"')
    await page.check('text="Josiah Carberry"')
    await page.click('text="Save and continue"')
    await page.check('text="No, by myself"')
    await page.click('text="Save and continue"')
    await page.check('text="No"')
    await page.click('text="Save and continue"')
    await page.check('text="I’m following the Code of Conduct"')
    await page.click('text="Save and continue"')

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

    await page.click('text="Post PREreview"')

    await expect(page.locator('h1')).toContainText('PREreview posted')
  },
)

test.extend(canLogIn)('can paste an already-written PREreview', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [] } }) },
  )
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="Yes"')
  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }

  await expect(page.locator('h1')).toHaveText('Paste your PREreview')
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('can format a PREreview', async ({ browserName, fetch, javaScriptEnabled, page }) => {
  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [] } }) },
  )
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')

  await page.locator('role=textbox[name="Write your PREreview"]').waitFor()
  await page.evaluate(() => document.querySelector('html')?.setAttribute('spellcheck', 'false'))

  if (!javaScriptEnabled) {
    await expect(page.getByRole('button', { name: 'Bold' })).toBeHidden()

    return
  }

  await page.locator('[contenteditable]').waitFor()
  await page.locator('role=textbox[name="Write your PREreview"]').clear()

  await page.getByRole('button', { name: 'Heading level 1' }).click()
  await expect(page.getByRole('button', { name: 'Heading level 1' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()

  if (browserName === 'webkit') {
    await page.locator('role=textbox[name="Write your PREreview"]').scrollIntoViewIfNeeded()
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
  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.type('consectetur')

  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Italic' })).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()

  await page.keyboard.type(' ')

  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()

  await page.keyboard.type('adipiscing ')

  await page.getByRole('button', { name: 'Subscript' }).click()

  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Subscript' })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.type('el')

  await page.getByRole('button', { name: 'Superscript' }).click()

  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Subscript' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.type('it')

  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Superscript' })).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'false')

  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')
  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()
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
})

test.extend(canLogIn)('can post a PREreview with more authors', async ({ fetch, javaScriptEnabled, page }) => {
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
  await page.click('text="Write a PREreview"')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="Yes"')
  await page.click('text="Save and continue"')

  await expect(page.locator('main')).toContainText('Add more authors')
  await expect(page).toHaveScreenshot()

  await page.click('text="Continue"')

  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

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

  await page.click('text="Post PREreview"')

  const main = page.locator('main')
  const h1 = main.locator('h1')

  await expect(h1).toContainText('PREreview posted')
  await expect(main).toContainText('Your DOI 10.5072/zenodo.1055808')
  await expect(main).toContainText('other authors’ details')
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('can post a PREreview with competing interests', async ({ fetch, javaScriptEnabled, page }) => {
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
  await page.click('text="Write a PREreview"')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')

  await page.check('text="Yes"')
  await page.fill('role=textbox[name="What are they?"]', 'Maecenas sed dapibus massa.')

  await expect(page).toHaveScreenshot()

  await page.click('text="Save and continue"')

  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

  const preview = page.locator('role=blockquote[name="Check your PREreview"]')

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

  await page.click('text="Post PREreview"')

  const main = page.locator('main')
  const h1 = main.locator('h1')

  await expect(h1).toContainText('PREreview posted')
  await expect(main).toContainText('Your DOI 10.5072/zenodo.1055808')
})

test.extend(canLogIn)('can post a PREreview using a pseudonym', async ({ fetch, javaScriptEnabled, page }) => {
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
  await page.click('text="Write a PREreview"')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Orange Panda"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

  const preview = page.locator('role=blockquote[name="Check your PREreview"]')

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

  await page.click('text="Post PREreview"')

  const main = page.locator('main')
  const h1 = main.locator('h1')

  await expect(h1).toContainText('PREreview posted')
  await expect(main).toContainText('Your DOI 10.5072/zenodo.1055808')
})

test.extend(canLogIn)('can change the review after previewing', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

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
  await page.click('text="Save and continue"')

  await expect(page.locator('role=blockquote[name="Check your PREreview"]')).toContainText(
    'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
  )
})

test.extend(canLogIn)('can change the name after previewing', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

  await expect(page.locator('role=blockquote[name="Check your PREreview"]')).toContainText('Josiah Carberry')

  await page.click('text="Change name"')

  await page.check('text="Orange Panda"')
  await page.click('text="Save and continue"')

  await expect(page.locator('role=blockquote[name="Check your PREreview"]')).toContainText('Orange Panda')
})

test.extend(canLogIn)('can go back through the form', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

  await expect(page.locator('h1')).toContainText('Check your PREreview')

  await page.goBack()

  await expect(page.locator('text="I’m following the Code of Conduct"')).toBeChecked()

  await page.goBack()

  await expect(page.locator('text="No"')).toBeChecked()

  await page.goBack()

  await expect(page.locator('text="No, by myself"')).toBeChecked()

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

test.extend(canLogIn)('see existing values when going back a step', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

  await expect(page.locator('h1')).toContainText('Check your PREreview')

  await page.click('text="Back"')

  await expect(page.locator('text="I’m following the Code of Conduct"')).toBeChecked()

  await page.click('text="Back"')

  await expect(page.locator('text="No"')).toBeChecked()

  await page.click('text="Back"')

  await expect(page.locator('text="No, by myself"')).toBeChecked()

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

test.extend(canLogIn)("aren't told about ORCID when already logged in", async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/log-in')
  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
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
  await expect(page.locator('h1')).toHaveText('PREreview this preprint')
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.click('text="Start now"')

  await expect(page.locator('h1')).toHaveText('Have you already written your PREreview?')
})

test.extend(canLogIn)(
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
    await page.click('text="Write a PREreview"')
    await page.click('text="Start now"')

    await page.fill('[type=email]', 'test@example.com')
    await page.fill('[type=password]', 'password')
    await page.keyboard.press('Enter')

    await page.check('text="No"')
    await page.click('text="Continue"')
    await page.click('text="Back to preprint"')
    await page.click('text="Write a PREreview"')

    await expect(page.locator('h1')).toHaveText('PREreview this preprint')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.click('text="Continue"')

    await expect(page.locator('h1')).toHaveText('Write your PREreview')
  },
)

test.extend(canLogIn)(
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
    await page.click('text="Write a PREreview"')
    await page.click('text="Start now"')

    await page.fill('[type=email]', 'test@example.com')
    await page.fill('[type=password]', 'password')
    await page.keyboard.press('Enter')

    await page.check('text="No"')
    await page.click('text="Continue"')
    await page.click('text="Back to preprint"')
    await page.context().clearCookies()
    await page.click('text="Write a PREreview"')
    await page.click('text="Start now"')

    await page.fill('[type=email]', 'test@example.com')
    await page.fill('[type=password]', 'password')
    await page.keyboard.press('Enter')

    await expect(page.locator('h1')).toHaveText('PREreview this preprint')
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.click('text="Continue"')

    await expect(page.locator('h1')).toHaveText('Write your PREreview')
  },
)

test.extend(canLogIn)('have to grant access to your ORCID iD', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.goto('/orcid?error=access_denied')

  await expect(page.locator('h1')).toHaveText('Sorry, we can’t log you in')
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
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')

  fetch.postOnce('http://orcid.test/token', { status: Status.ServiceUnavailable })
  await page.keyboard.press('Enter')

  await expect(page.locator('h1')).toHaveText('Sorry, we’re having problems')
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

test.extend(canLogIn)('are told if Zenodo is unavailable', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.check('text="No"')
  await page.click('text="Save and continue"')
  await page.check('text="I’m following the Code of Conduct"')
  await page.click('text="Save and continue"')

  fetch.postOnce('http://zenodo.test/api/deposit/depositions', { status: Status.ServiceUnavailable })

  await page.click('text="Post PREreview"')

  await expect(page.locator('h1')).toHaveText('Sorry, we’re having problems')
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

test.extend(canLogIn)(
  "are directed to the current site if you don't have a pseudonym",
  async ({ fetch, javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.click('text="Start now"')

    await page.fill('[type=email]', 'test@example.com')
    await page.fill('[type=password]', 'password')

    fetch.get(
      {
        url: 'http://prereview.test/api/v2/users/0000-0002-1825-0097',
        headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
      },
      { status: Status.NotFound },
      { overwriteRoutes: true },
    )
    await page.keyboard.press('Enter')

    await expect(page.locator('h1')).toHaveText('Sorry, you can’t post a PREreview yet')
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

test.extend(canLogIn)('have to say if you have already written your PREreview', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=group[name="Have you already written your PREreview?"]')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page).toHaveScreenshot()

  await page.click('text="Select yes if you have already written your PREreview"')

  await expect(page.locator('role=radio[name="No"]')).toBeFocused()
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('have to enter a review', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }

  await page.locator('role=textbox[name="Write your PREreview"]').clear()
  await page.click('text="Save and continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveScreenshot()

  await page.click('text="Enter your PREreview"')

  await expect(page.locator('role=textbox[name="Write your PREreview"]')).toBeFocused()
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('have to paste a review', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="Yes"')
  await page.click('text="Continue"')

  await page.click('text="Save and continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=textbox[name="Paste your PREreview"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveScreenshot()

  await page.click('text="Paste your PREreview"')

  await expect(page.locator('role=textbox[name="Paste your PREreview"]')).toBeFocused()
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('have to choose a name', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')

  await page.click('text="Save and continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=group[name="What name would you like to use?"]')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page).toHaveScreenshot()

  await page.click('text="Select the name that you would like to use"')

  await expect(page.locator('role=radio[name="Josiah Carberry"]')).toBeFocused()
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('have to say if there are more authors', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')

  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')

  await page.click('text="Save and continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=group[name="Did you write the PREreview with anyone else?"]')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page).toHaveScreenshot()

  await page.click('text="Select yes if you wrote the PREreview with someone else"')

  await expect(page.locator('role=radio[name="No, by myself"]')).toBeFocused()
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('have to declare any competing interests', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')

  await page.click('text="Save and continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=group[name="Do you have any competing interests?"]')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page).toHaveScreenshot()

  await page.click('text="Select yes if you have any competing interests"')

  await expect(page.locator('role=radio[name="No"]')).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.check('text="Yes"')

  await page.click('text="Save and continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=textbox[name="What are they?"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveScreenshot()

  await page.click('text="Enter details of your competing interests"')

  await expect(page.locator('role=textbox[name="What are they?"]')).toBeFocused()
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('have to agree to the Code of Conduct', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.click('text="Start now"')

  await page.fill('[type=email]', 'test@example.com')
  await page.fill('[type=password]', 'password')
  await page.keyboard.press('Enter')

  await page.check('text="No"')
  await page.click('text="Continue"')

  if (javaScriptEnabled) {
    await page.locator('[contenteditable]').waitFor()
  }
  await page.fill(
    'role=textbox[name="Write your PREreview"]',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await page.click('text="Save and continue"')
  await page.check('text="Josiah Carberry"')
  await page.click('text="Save and continue"')
  await page.check('text="No, by myself"')
  await page.click('text="Save and continue"')
  await page.check('text="No"')
  await page.click('text="Save and continue"')

  await page.click('text="Save and continue"')

  if (javaScriptEnabled) {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeFocused()
  } else {
    await expect(page.locator('role=alert[name="There is a problem"]')).toBeVisible()
  }
  await expect(page.locator('role=group[name="Code of Conduct"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveScreenshot()

  await page.click('text="Confirm that you are following the Code of Conduct"')

  await expect(page.locator('role=checkbox[name="I’m following the Code of Conduct"]')).toBeFocused()
  await expect(page).toHaveScreenshot()
})
