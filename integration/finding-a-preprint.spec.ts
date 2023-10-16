import type { Doi } from 'doi-ts'
import { Status } from 'hyper-ts'
import type { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { RecordsC } from '../src/zenodo-ts'
import { expect, test } from './base'

test('might not find anything', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/find-a-preprint')
  await page.getByLabel('Preprint DOI or URL').fill('10.1101/this-should-not-find-anything')

  fetch.get('https://api.crossref.org/works/10.1101%2Fthis-should-not-find-anything', { status: Status.NotFound })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t know this preprint')
  await page.mouse.move(0, 0)
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

test('can find and view a preprint', async ({ contextOptions, fetch, page }, testInfo) => {
  await page.goto('/find-a-preprint')
  await page.getByLabel('Preprint DOI or URL').fill('10.1101/2022.01.13.476201')

  testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  fetch
    .getOnce(
      {
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
      },
      {
        body: RecordsC.encode({
          hits: {
            total: 1,
            hits: [
              {
                conceptdoi: '10.5072/zenodo.1061863' as Doi,
                conceptrecid: 1061863,
                files: [
                  {
                    links: {
                      self: new URL('http://example.com/file'),
                    },
                    filename: 'review.html',
                    filesize: 58,
                  },
                ],
                id: 1061864,
                links: {
                  latest: new URL('http://example.com/latest'),
                  latest_html: new URL('http://example.com/latest_html'),
                },
                metadata: {
                  communities: [{ identifier: 'prereview-reviews' }],
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
                  license: 'cc-by-4.0',
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
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                  title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
                },
              },
            ],
          },
        }),
      },
    )
    .getOnce('http://example.com/review.html/content', {
      body: '<h1>Some title</h1><p>The manuscript &quot;The role of LHCBM1 in non-photochemical quenching in <em>Chlamydomonas reinhardtii</em>&quot; by Liu et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in <em>Chlamydomonas reinhardtii</em>. The Chlamydomonas mutant lacking LHCBM1 (<em>npq5</em>) displays a low NPQ phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower NPQ phenotype in <em>npq5</em>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ induction and found that <em>npq5 </em>NPQ is still low. They propose that absence of LHCBM1 could alter the association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.</p>',
    })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(
    page
      .getByRole('complementary', { name: 'Preprint details' })
      .getByRole('article', { name: 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' }),
  ).toContainText('Non-photochemical quenching (NPQ) is the process that protects')
  await expect(page.getByRole('main')).toContainText('1 PREreview')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test('might not load the preprint in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/find-a-preprint')
  await page.getByLabel('Preprint DOI or URL').fill('10.1101/this-should-take-too-long')

  fetch.get(
    'https://api.crossref.org/works/10.1101%2Fthis-should-take-too-long',
    new Promise(() => setTimeout(() => ({ status: Status.NotFound }), 2000)),
  )

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
  await page.mouse.move(0, 0)
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
  await page.goto('/find-a-preprint')
  await page.getByLabel('Preprint DOI or URL').fill('10.1101/2022.01.13.476201')

  fetch.getOnce(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    new Promise(() => setTimeout(() => ({ body: RecordsC.encode({ hits: { total: 0, hits: [] } }) }), 2000)),
  )

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
  await page.mouse.move(0, 0)
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

test('when it is not a preprint', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/find-a-preprint')
  await page.getByLabel('Preprint DOI or URL').fill('10.1101/not-a-preprint')

  fetch.get('https://api.crossref.org/works/10.1101%2Fnot-a-preprint', {
    body: {
      status: 'ok',
      'message-type': 'work',
      'message-version': '1.0.0',
      message: {
        institution: [{ name: 'bioRxiv' }],
        indexed: { 'date-parts': [[2023, 3, 9]], 'date-time': '2023-03-09T05:34:47Z', timestamp: 1678340087045 },
        posted: { 'date-parts': [[2023, 3, 1]] },
        'group-title': 'Biophysics',
        'reference-count': 46,
        publisher: 'Cold Spring Harbor Laboratory',
        'content-domain': { domain: [], 'crossmark-restriction': false },
        'short-container-title': [],
        accepted: { 'date-parts': [[2023, 3, 1]] },
        abstract:
          '<jats:title>Abstract</jats:title><jats:p>Protein tyrosine phosphatase 1B (PTP1B) is a negative regulator of the insulin and leptin signaling pathways, making it a highly attractive target for the treatment of type II diabetes. For PTP1B to perform its enzymatic function, a loop referred to as the \u201cWPD loop\u201d must transition between open (catalytically incompetent) and closed (catalytically competent) conformations, which have both been resolved by X-ray crystallography. Although prior studies have established this transition as the rate-limiting step for catalysis, the transition mechanism for PTP1B and other PTPs has been unclear. Here we present an atomically detailed model of WPD-loop transitions in PTP1B based on unbiased, long-timescale molecular dynamics simulations and weighted ensemble simulations. We found that a specific WPD-loop region\u2014 the PDFG motif\u2014acted as the key conformational switch, with structural changes to the motif being necessary and sufficient for transitions between long-lived open and closed states of the loop. Simulations starting from the closed state repeatedly visited open states of the loop that quickly closed again unless the infrequent conformational switching of the motif stabilized the open state. The functional role of the PDFG motif is supported by the fact that it (or the similar PDHG motif) is conserved across all PTPs. Bioinformatic analysis shows that the PDFG motif is also conserved, and adopts two distinct conformations, in deiminases, and the related DFG motif is known to function as a conformational switch in many kinases, suggesting that PDFG-like motifs may control transitions between structurally distinct, long-lived conformational states in multiple protein families.</jats:p>',
        DOI: '10.1101/2023.02.28.529746',
        type: 'posted-content',
        created: { 'date-parts': [[2023, 3, 3]], 'date-time': '2023-03-03T17:50:24Z', timestamp: 1677865824000 },
        source: 'Crossref',
        'is-referenced-by-count': 0,
        title: ['A conserved local structural motif controls the kinetics of PTP1B catalysis'],
        prefix: '10.1101',
        author: [
          { given: 'Christine Y.', family: 'Yeh', sequence: 'first', affiliation: [] },
          { given: 'Jesus A.', family: 'Izaguirre', sequence: 'additional', affiliation: [] },
          { given: 'Jack B.', family: 'Greisman', sequence: 'additional', affiliation: [] },
          { given: 'Lindsay', family: 'Willmore', sequence: 'additional', affiliation: [] },
          { given: 'Paul', family: 'Maragakis', sequence: 'additional', affiliation: [] },
          { given: 'David E.', family: 'Shaw', sequence: 'additional', affiliation: [] },
        ],
        member: '246',
        'container-title': [],
        'original-title': [],
        link: [
          {
            URL: 'https://syndication.highwire.org/content/doi/10.1101/2023.02.28.529746',
            'content-type': 'unspecified',
            'content-version': 'vor',
            'intended-application': 'similarity-checking',
          },
        ],
        deposited: { 'date-parts': [[2023, 3, 8]], 'date-time': '2023-03-08T10:27:41Z', timestamp: 1678271261000 },
        score: 1,
        resource: { primary: { URL: 'http://biorxiv.org/lookup/doi/10.1101/2023.02.28.529746' } },
        subtitle: [],
        'short-title': [],
        issued: { 'date-parts': [[2023, 3, 1]] },
        'references-count': 46,
        URL: 'http://dx.doi.org/10.1101/2023.02.28.529746',
        relation: {},
        published: { 'date-parts': [[2023, 3, 1]] },
        subtype: 'letter',
      },
    },
  })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we only support preprints')
  await page.mouse.move(0, 0)
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

test('when is DOI is not supported', async ({ javaScriptEnabled, page }) => {
  await page.goto('/find-a-preprint')
  await page.getByLabel('Preprint DOI or URL').fill('10.5555/12345678')

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this DOI')
  await page.mouse.move(0, 0)
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

test('when is URL is not supported', async ({ javaScriptEnabled, page }) => {
  await page.goto('/find-a-preprint')
  await page
    .getByLabel('Preprint DOI or URL')
    .fill('https://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this URL')
  await page.mouse.move(0, 0)
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

test('have to enter a preprint DOI or URL', async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
  const alert = page.getByRole('alert', { name: 'There is a problem' })

  await page.goto('/find-a-preprint')
  await page.getByLabel('Preprint DOI or URL').fill(' not a DOI ')
  await page.getByRole('button', { name: 'Continue' }).click()

  if (javaScriptEnabled) {
    await expect(alert).toBeFocused()
  } else {
    await expect(alert).toBeInViewport()
  }
  await expect(page.getByLabel('Preprint DOI or URL')).toHaveAttribute('aria-invalid', 'true')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await alert.getByRole('link', { name: 'Enter a preprint DOI or URL' }).click()

  await expect(page.getByLabel('Preprint DOI or URL')).toBeFocused()
  await expect(page.getByLabel('Preprint DOI or URL')).toHaveValue(' not a DOI ')

  testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

  await page.mouse.move(0, 0)
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
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
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
