import { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { RecordsC } from 'zenodo-ts'
import { expect, test } from './test'

test('might not find anything', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/')
  await page
    .getByRole('form', { name: 'Find and post PREreviews' })
    .getByLabel('Preprint DOI')
    .fill('10.1101/this-should-not-find-anything')

  fetch.get('https://api.crossref.org/works/10.1101%2Fthis-should-not-find-anything', { status: Status.NotFound })

  await page.getByRole('button', { name: 'Continue' }).click()

  const h1 = page.getByRole('heading', { level: 1 })

  await expect(h1).toHaveText('Page not found')
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

test('can find and view a preprint', async ({ fetch, page }) => {
  await page.goto('/')
  await page
    .getByRole('form', { name: 'Find and post PREreviews' })
    .getByLabel('Preprint DOI')
    .fill('10.1101/2022.01.13.476201')

  await expect(page).toHaveScreenshot()

  fetch.getOnce(
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
                description:
                  '<p>The manuscript &quot;The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>&quot; by Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in <em>Chlamydomonas reinhardtii</em>. The Chlamydomonas mutant lacking LHCBM1 (<em>npq5</em>) displays a low NPQ phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower NPQ phenotype in <em>npq5</em>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ induction and found that <em>npq5 </em>NPQ is still low. They propose that absence of LHCBM1 could alter the association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.</p>',
                doi: '10.5281/zenodo.1061864' as Doi,
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
            },
          ],
        },
      }),
    },
  )

  await page.getByRole('button', { name: 'Continue' }).click()

  const preprint = page
    .getByRole('complementary', { name: 'Preprint details' })
    .getByRole('article', { name: 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' })
  const reviews = page.getByRole('main')

  await expect(preprint).toContainText('Non-photochemical quenching (NPQ) is the process that protects')
  await expect(reviews).toContainText('1 PREreview')
  await expect(page).toHaveScreenshot()
})

test('might not load the preprint in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/')
  await page
    .getByRole('form', { name: 'Find and post PREreviews' })
    .getByLabel('Preprint DOI')
    .fill('10.1101/this-should-take-too-long')

  fetch.get(
    'https://api.crossref.org/works/10.1101%2Fthis-should-take-too-long',
    new Promise(() => setTimeout(() => ({ status: Status.NotFound }), 2000)),
  )

  await page.getByRole('button', { name: 'Continue' }).click()

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

test('might not load PREreviews in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/')
  await page
    .getByRole('form', { name: 'Find and post PREreviews' })
    .getByLabel('Preprint DOI')
    .fill('10.1101/2022.01.13.476201')

  fetch.getOnce(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    new Promise(() => setTimeout(() => ({ body: RecordsC.encode({ hits: { hits: [] } }) }), 2000)),
  )

  await page.getByRole('button', { name: 'Continue' }).click()

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

test('have to enter a preprint DOI', async ({ javaScriptEnabled, page }) => {
  await page.goto('/')
  await page.getByRole('form', { name: 'Find and post PREreviews' }).getByLabel('Preprint DOI').fill('10.5555/12345678')

  await page.getByRole('button', { name: 'Continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeVisible()
  }
  await expect(page.getByLabel('Preprint DOI')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveScreenshot()

  await page.getByRole('link', { name: 'Enter a preprint DOI' }).click()

  await expect(page.getByLabel('Preprint DOI')).toBeFocused()
  await expect(page.getByLabel('Preprint DOI')).toHaveValue('10.5555/12345678')
  await expect(page).toHaveScreenshot()
})

test('can skip to the main content', async ({ javaScriptEnabled, page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})

test('can skip to the preprint details', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { hits: [] } }) },
  )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to preprint details' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('complementary', { name: 'Preprint details' })).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})
