import { Status } from 'hyper-ts'
import { areLoggedIn, canLogIn, canRequestReviews, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'can request a PREreview',
  async ({ fetch, page }) => {
    await page.goto('/request-a-prereview')
    await page.getByLabel('Which preprint would you like reviewed?').fill('10.1101/12345678')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.goto('/preprints/doi-10.1101-12345678')

    await page.getByRole('link', { name: 'Request a PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

    fetch.postOnce('https://coar-notify-sandbox.prereview.org/inbox', { status: Status.Created })

    await page.getByRole('button', { name: 'Request PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request published')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'are returned to the next step if you have already started requesting a PREreview',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.goto('/preprints/doi-10.1101-12345678')
    await page.getByRole('link', { name: 'Request a PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'can go back through the form',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your request')

    await page.goBack()

    await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)('requires a valid preprint', async ({ page }) => {
  await page.goto('/request-a-prereview')
  await page.getByLabel('Which preprint would you like reviewed?').fill('not-a-preprint')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByLabel('Which preprint would you like reviewed?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter the preprint DOI or URL' }).click()

  await expect(page.getByLabel('Which preprint would you like reviewed?')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'when the DOI is not supported',
  async ({ page }) => {
    await page.goto('/request-a-prereview')
    await page.getByLabel('Which preprint would you like reviewed?').fill('10.5555/12345678')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this DOI')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'when the URL is not supported',
  async ({ page }) => {
    await page.goto('/request-a-prereview')
    await page
      .getByLabel('Which preprint would you like reviewed?')
      .fill('https://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this URL')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'when it is not a preprint',
  async ({ fetch, page }) => {
    await page.goto('/request-a-prereview')
    await page.getByLabel('Which preprint would you like reviewed?').fill('10.1101/not-a-preprint')

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
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'when the preprint is not found',
  async ({ fetch, page }) => {
    await page.goto('/request-a-prereview')
    await page.getByLabel('Which preprint would you like reviewed?').fill('10.1101/this-should-not-find-anything')

    fetch.get('https://api.crossref.org/works/10.1101%2Fthis-should-not-find-anything', { status: Status.NotFound })

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t know this preprint')
  },
)
