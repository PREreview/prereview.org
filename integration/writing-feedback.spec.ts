import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { type Record, RecordC, RecordsC } from 'zenodo-ts'
import { areLoggedIn, canLogIn, canWriteFeedback, expect, test, willPublishFeedback } from './base.js'

test.extend(canLogIn).extend(canWriteFeedback).extend(willPublishFeedback)(
  'can write feedback on a PREreview',
  async ({ fetch, javaScriptEnabled, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864')
    await page.getByRole('link', { name: 'Write a comment' }).click()

    await expect(page.getByRole('main')).toContainText('We will ask you to log in')

    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()

    await page.getByLabel('Write your feedback').click()
    await page.keyboard.type('# Some title')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Lorem ipsum dolor sit "amet", *consectetur* ')
    await (javaScriptEnabled ? page.keyboard.press('Control+b') : page.keyboard.type('<b>'))
    await page.keyboard.type('adipiscing elit')
    await (javaScriptEnabled ? page.keyboard.press('Control+b') : page.keyboard.type('</b>'))
    await page.keyboard.type('.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Publish feedback' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We’re publishing your feedback')

    if (javaScriptEnabled) {
      await expect(page.getByRole('link', { name: 'Continue' })).not.toBeVisible()

      await page.getByRole('link', { name: 'Continue' }).click()
    } else {
      await expect(async () => {
        await page.getByRole('link', { name: 'Reload page' }).click()

        await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('We’re publishing your feedback')
      }).toPass()
    }

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Feedback published')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'can change the feedback after previewing',
  async ({ fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your feedback' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

    await page.getByRole('link', { name: 'Change feedback' }).click()
    await page.waitForLoadState()

    await page
      .getByLabel('Write your feedback')
      .fill('Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your feedback' })).toContainText(
      'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'can change your name after previewing',
  async ({ fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

    await page.getByRole('link', { name: 'Change name' }).click()

    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Published name Orange Panda')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'can change the competing interests after previewing',
  async ({ fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Competing interests The author of this feedback declares that they have no competing interests.',
    )

    await page.getByRole('link', { name: 'Change competing interests' }).click()

    await page.getByLabel('Yes').check()
    await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Competing interests Maecenas sed dapibus massa.')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'are returned to the next step if you have already started feedback on a PREreview',
  async ({ fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto('/reviews/1061864')
    await page.getByRole('link', { name: 'Write a comment' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write feedback')
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What name would you like to use?')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'can go back through the form',
  async ({ fetch, javaScriptEnabled, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your feedback')

    await page.goBack()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

    await page.goBack()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your feedback')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Write your feedback')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }

    await page.goBack()

    await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'see existing values when going back a step',
  async ({ fetch, javaScriptEnabled, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your feedback')

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your feedback')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Write your feedback')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  "aren't told about ORCID when already logged in",
  async ({ fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write feedback')
    await expect(page.getByRole('main')).not.toContainText('ORCID')

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your feedback')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'have to enter feedback',
  async ({ javaScriptEnabled, fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Write your feedback')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Enter your feedback' }).click()

    await expect(page.getByLabel('Write your feedback')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'have to choose a name',
  async ({ javaScriptEnabled, fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'What name would you like to use?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select the name that you would like to use' }).click()

    await expect(page.getByLabel('Josiah Carberry')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'have to declare any competing interests',
  async ({ javaScriptEnabled, fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Do you have any competing interests?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select yes if you have any competing interests' }).click()

    await expect(page.getByLabel('No')).toBeFocused()

    await page.getByLabel('Yes').check()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('What are they?')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Enter details of your competing interests' }).click()

    await expect(page.getByLabel('What are they?')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canWriteFeedback)(
  'have to agree to the Code of Conduct',
  async ({ javaScriptEnabled, fetch, page }) => {
    const record: Record = {
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
          { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
        ],
        description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
        doi: Doi('10.5072/zenodo.1061864'),
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
    }

    fetch
      .get('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })
      .get(
        {
          name: 'existing-feedback',
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.5072/zenodo.1061864"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )

    await page.goto('/reviews/1061864/write-feedback')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your feedback').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }

    await expect(page.getByRole('group', { name: 'Code of Conduct' })).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Confirm that you are following the Code of Conduct' }).click()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeFocused()
  },
)
