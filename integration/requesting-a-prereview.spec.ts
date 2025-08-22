import * as StatusCodes from '../src/StatusCodes.js'
import { areLoggedIn, canLogIn, expect, test } from './base.js'

test.extend(canLogIn)('can request a PREreview', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Request a review' }).click()
  await page.getByLabel('Which preprint would you like reviewed?').fill('10.1101/12345678')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')
  await expect(page.getByRole('main')).toContainText('We will ask you to log in')

  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
  await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

  fetch.postOnce('http://coar-notify.prereview.test/inbox', { status: StatusCodes.Created })

  await page.getByRole('button', { name: 'Request PREreview' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request published')
})

test('can choose a locale before starting', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Solicite uma avaliação')
})

test.extend(canLogIn).extend(areLoggedIn)('can request a PREreview using a pseudonym', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Orange Panda').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
  await expect(page.getByRole('main')).toContainText('Published name Orange Panda')

  fetch.postOnce('http://coar-notify.prereview.test/inbox', { status: StatusCodes.Created })

  await page.getByRole('button', { name: 'Request PREreview' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request published')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started requesting a PREreview',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto('/', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Request a review' }).click()
    await page.getByLabel('Which preprint would you like reviewed?').fill('10.1101/12345678')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
  },
)

test.extend(canLogIn).extend(areLoggedIn)("aren't told about ORCID when already logged in", async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })

  await expect(page.getByRole('main')).not.toContainText('ORCID')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What name would you like to use?')
})

test.extend(canLogIn).extend(areLoggedIn)('can change the name after previewing', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

  await page.getByRole('link', { name: 'Change name' }).click()

  await page.getByLabel('Orange Panda').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Published name Orange Panda')
})

test.extend(canLogIn).extend(areLoggedIn)('can go back through the form', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your request')

  await page.goBack()

  await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

  await page.goBack()

  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
})

test.extend(canLogIn).extend(areLoggedIn)('see existing values when going back a step', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Josiah Carberry')).toBeChecked()
})

test.extend(canLogIn).extend(areLoggedIn)('requires a valid preprint', async ({ page }) => {
  await page.goto('/request-a-prereview', { waitUntil: 'commit' })
  await page.getByLabel('Which preprint would you like reviewed?').fill('not-a-preprint')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByLabel('Which preprint would you like reviewed?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter the preprint DOI or URL' }).click()

  await expect(page.getByLabel('Which preprint would you like reviewed?')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)('when the DOI is not supported', async ({ page }) => {
  await page.goto('/request-a-prereview', { waitUntil: 'commit' })
  await page.getByLabel('Which preprint would you like reviewed?').fill('10.5555/12345678')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this DOI')
})

test.extend(canLogIn).extend(areLoggedIn)('when the URL is not supported', async ({ page }) => {
  await page.goto('/request-a-prereview', { waitUntil: 'commit' })
  await page
    .getByLabel('Which preprint would you like reviewed?')
    .fill('https://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this URL')
})

test.extend(canLogIn).extend(areLoggedIn)('when it is not a preprint', async ({ fetch, page }) => {
  await page.goto('/request-a-prereview', { waitUntil: 'commit' })
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
})

test.extend(canLogIn).extend(areLoggedIn)('when the preprint is not found', async ({ fetch, page }) => {
  await page.goto('/request-a-prereview', { waitUntil: 'commit' })
  await page.getByLabel('Which preprint would you like reviewed?').fill('10.1101/this-should-not-find-anything')

  fetch.get('https://api.crossref.org/works/10.1101%2Fthis-should-not-find-anything', { status: StatusCodes.NotFound })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t know this preprint')
})

test.extend(canLogIn).extend(areLoggedIn)('when the preprint is not supported', async ({ fetch, page }) => {
  await page.goto('/request-a-prereview', { waitUntil: 'commit' })
  await page.getByLabel('Which preprint would you like reviewed?').fill('https://philsci-archive.pitt.edu/23254/')

  fetch.get('https://philsci-archive.pitt.edu/cgi/export/eprint/23254/JSON/pittphilsci-eprint-23254.json', {
    body: {
      subjects: [
        'biology',
        'earth-sciences',
        'ethical-issues',
        'experimentation',
        'mathematics',
        'models-and-idealization',
        'physics',
        'science-education',
        'social-epistemology-of-science',
        'sociology',
        'thought-experiments',
      ],
      eprintid: 23254,
      date: 2024,
      userid: 27167,
      documents: [
        {
          language: 'en',
          placement: 1,
          eprintid: 23254,
          files: [
            {
              hash_type: 'MD5',
              mtime: '2024-04-02 16:18:49',
              datasetid: 'document',
              fileid: 210365,
              objectid: 80655,
              uri: 'https://philsci-archive.pitt.edu/id/file/210365',
              mime_type: 'application/pdf',
              hash: '6bcf2f0b4e13b346fc4476f18b8bfdae',
              filesize: 386692,
              filename: 'Final Preprint Qualitative Study of Scientific Imagination.pdf',
            },
          ],
          rev_number: 2,
          uri: 'https://philsci-archive.pitt.edu/id/document/80655',
          main: 'Final Preprint Qualitative Study of Scientific Imagination.pdf',
          mime_type: 'application/pdf',
          docid: 80655,
          format: 'text',
          security: 'public',
          pos: 1,
        },
      ],
      rev_number: 18,
      creators: [
        {
          orcid: '0000-0002-4165-2641',
          name: { lineage: null, given: 'Michael T.', honourific: null, family: 'Stuart' },
          id: 'mike.stuart.post@gmail.com',
        },
      ],
      dir: 'disk0/00/02/32/54',
      keywords:
        'scientific imagination; imagination; qualitative methods; empirical philosophy of science; internalism; externalism; consequentialism; virtue epistemology; deontology; ethics of science',
      lastmod: '2024-04-05 06:43:17',
      metadata_visibility: 'show',
      eprint_status: 'archive',
      status_changed: '2024-04-05 06:43:17',
      datestamp: '2024-04-05 06:43:17',
      uri: 'https://philsci-archive.pitt.edu/id/eprint/23254',
      note: 'Forthcoming in Qualitative Psychology',
      full_text_status: 'public',
      abstract:
        'Imagination is extremely important for science, yet very little is known about how scientists actually use it. Are scientists taught to imagine? What do they value imagination for? How do social and disciplinary factors shape it? How is the labor of imagining distributed? These questions should be high priority for anyone who studies or practices science, and this paper argues that the best methods for addressing them are qualitative. I summarize a few preliminary findings derived from recent interview-based and observational qualitative studies that I have performed. These finding include: (i) imagination is only valued for use in addressing maximally specific problems, and only when all else fails; (ii) younger scientists and scientists who are members of underrepresented groups express less positive views about imagination in general, and have less confidence in their own imaginations; (iii) while scientists seem to employ various epistemological frameworks to evaluate imaginings, overall they appear to be epistemic consequentialists about imagination, and this holds also for their evaluations of the tools they use to extend the power of their imaginations. I close by discussing the epistemic and ethical consequences of these findings, and then suggesting a few research avenues that could be explored next as we move forward in the study of scientific imagination.',
      type: 'pittpreprint',
      title: 'The Qualitative Study of Scientific Imagination',
    },
  })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support requests for this preprint')
})

test.extend(canLogIn).extend(areLoggedIn)('have to choose a name', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  await expect(page.getByRole('group', { name: 'What name would you like to use?' })).toHaveAttribute(
    'aria-invalid',
    'true',
  )

  await page.getByRole('link', { name: 'Select the name that you would like to use' }).click()

  await expect(page.getByLabel('Josiah Carberry')).toBeFocused()
})

test('can view a recent request', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page
    .getByRole('region', { name: 'Recent review requests' })
    .getByRole('link', { name: 'A conserved local structural motif controls the kinetics of PTP1B catalysis' })
    .click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
})

test('can view an older request', async ({ javaScriptEnabled, page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all requests' }).click()

  await expect(page).toHaveTitle('Recent review requests (page 1) | PREreview')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recent review requests')

  if (javaScriptEnabled) {
    await page.getByRole('button', { name: 'Menu' }).click()

    await expect(page.getByRole('link', { name: 'Requests', exact: true })).toHaveAttribute('aria-current', 'page')
  }

  await page
    .getByRole('link', { name: 'A conserved local structural motif controls the kinetics of PTP1B catalysis' })
    .click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
})

test('can view an older request in a specific language', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all requests' }).click()

  const filters = page.getByRole('search', { name: 'Filter' })

  await expect(page).toHaveTitle('Recent review requests (page 1) | PREreview')
  await expect(filters.getByLabel('Language').locator('[selected]')).toHaveText('Any')

  await filters.getByLabel('Language').selectOption('English')
  await filters.getByRole('button', { name: 'Filter results' }).click()

  await expect(page).toHaveTitle('Recent review requests (English, page 1) | PREreview')
  await expect(filters.getByLabel('Language').locator('[selected]')).toHaveText('English')
  await expect(
    page.getByRole('link', { name: 'A conserved local structural motif controls the kinetics of PTP1B catalysis' }),
  ).toBeHidden()

  await page
    .getByRole('link', { name: 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' })
    .click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
})

test('can view an older request in a specific field', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all requests' }).click()

  const filters = page.getByRole('search', { name: 'Filter' })

  await expect(page).toHaveTitle('Recent review requests (page 1) | PREreview')
  await expect(filters.getByLabel('Field').locator('[selected]')).toHaveText('Any')

  await filters.getByLabel('Field').selectOption('Immunology and Microbiology')
  await filters.getByRole('button', { name: 'Filter results' }).click()

  await expect(page).toHaveTitle('Recent review requests (Immunology and Microbiology, page 1) | PREreview')
  await expect(filters.getByLabel('Field').locator('[selected]')).toHaveText('Immunology and Microbiology')
  await expect(
    page.getByRole('link', { name: 'The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii' }),
  ).toBeHidden()

  await page
    .getByRole('link', { name: 'A conserved local structural motif controls the kinetics of PTP1B catalysis' })
    .click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
})
