import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { Record, RecordC, RecordsC } from 'zenodo-ts'
import { expect, test } from './base'

test('can find and view a review', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1061863' as Doi,
    conceptrecid: 1061863,
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
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
        { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
        { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
        { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
        { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
        { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: '10.5072/zenodo.1061864' as Doi,
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
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [record] } }) },
  )

  fetch
    .getOnce('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
    .getOnce('http://example.com/file', {
      body: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page
    .getByRole('article', { name: 'PREreview by Jingfang Hao et al.' })
    .getByRole('link', { name: 'Read the PREreview by Jingfang Hao et al.' })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
  await expect(page).toHaveScreenshot()
})

test('can view a recent review', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1061863' as Doi,
    conceptrecid: 1061863,
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
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
        { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
        { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
        { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
        { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
        { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: '10.5072/zenodo.1061864' as Doi,
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
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch
    .getOnce('http://zenodo.test/api/records/7747129', { body: RecordC.encode(record) })
    .getOnce('http://example.com/file', {
      body: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })

  const recentReviews = page.getByRole('region', { name: 'Recent PREreviews' })

  await page.goto('/')
  await recentReviews.scrollIntoViewIfNeeded()

  await expect(page).toHaveScreenshot()

  await recentReviews
    .getByRole('link', {
      name: 'CJ San Felipe reviewed “A conserved local structural motif controls the kinetics of PTP1B catalysis”',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test('can skip to the reviews', async ({ fetch, javaScriptEnabled, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1061863' as Doi,
    conceptrecid: 1061863,
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
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
        { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
        { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
        { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
        { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
        { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: '10.5072/zenodo.1061864' as Doi,
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
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [record] } }) },
  )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to PREreviews' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})

test('can skip to the review', async ({ fetch, javaScriptEnabled, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1061863' as Doi,
    conceptrecid: 1061863,
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
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
        { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
        { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
        { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
        { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
        { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: '10.5072/zenodo.1061864' as Doi,
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
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch
    .getOnce('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
    .getOnce('http://example.com/file', {
      body: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })

  await page.goto('/reviews/1061864')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to PREreview' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})

test('might not load the PREreview in time', async ({ fetch, javaScriptEnabled, page }) => {
  const record: Record = {
    conceptdoi: '10.5072/zenodo.1061863' as Doi,
    conceptrecid: 1061863,
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
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
        { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
        { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
        { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
        { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
        { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: '10.5072/zenodo.1061864' as Doi,
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
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.getOnce(
    'http://zenodo.test/api/records/1061864',
    new Promise(() => setTimeout(() => ({ body: RecordC.encode(record) }), 2000)),
  )

  await page.goto('/reviews/1061864')

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
