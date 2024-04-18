import { Status } from 'hyper-ts'
import { RecordsC } from 'zenodo-ts'
import { areLoggedIn, canLogIn, canRequestReviews, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'can request a PREreview',
  async ({ fetch, page }) => {
    fetch
      .get('https://api.crossref.org/works/10.1101%2F2024.02.07.578830', {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            institution: [{ name: 'bioRxiv' }],
            indexed: { 'date-parts': [[2024, 3, 2]], 'date-time': '2024-03-02T00:34:28Z', timestamp: 1709339668744 },
            posted: { 'date-parts': [[2024, 2, 8]] },
            'group-title': 'Cell Biology',
            'reference-count': 68,
            publisher: 'Cold Spring Harbor Laboratory',
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            accepted: { 'date-parts': [[2024, 2, 8]] },
            abstract:
              '<jats:title>Abstract</jats:title><jats:p>Stress granules are cytoplasmic membraneless organelles that sequester proteins and non-translating mRNAs in response to various stressors. To assess the contributions of mRNA and RNA-binding proteins to stress granule formation, we use microinjection to deliver protein-free mRNA into the cytoplasm in a controlled manner. We demonstrate that mRNAs trigger stress granule formation through two mechanisms that are enhanced by the presence of G3BP1 and G3BP2. Low concentrations of<jats:italic>in vitro</jats:italic>transcribed mRNA activated protein kinase R (PKR), leading to phosphorylation and inhibition of the eukaryotic translation initiation factor eIF2\u03b1 and stress granule formation. This was inhibited by replacing uridine with pseudouridine in the mRNA or by treating it with RNase III, which cleaves double-stranded RNA. High concentrations of mRNA triggered stress granule formation by a mechanism that was independent of PKR and enhanced by G3BP1/2, highlighting the importance of both protein-free mRNA and RNA-binding proteins in stress granule formation.</jats:p><jats:sec><jats:title>Graphical Abstract/Model</jats:title><jats:fig id="ufig1" position="float" orientation="portrait" fig-type="figure"><jats:graphic xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="578830v1_ufig1" position="float" orientation="portrait" /></jats:fig></jats:sec><jats:sec><jats:title>Summary</jats:title><jats:p>Microinjected mRNA induces stress granules in mammalian cells by two G3BP1/2-dependent mechanisms: one requires the stress-sensing protein kinase PKR to phosphorylate the translation initiation factor eIF2\u03b1, and the other is independent of PKR and phospho-eIF2\u03b1 and acts when the cytoplasmic concentration of ribosome-free mRNA is increased acutely.</jats:p></jats:sec>',
            DOI: '10.1101/2024.02.07.578830',
            type: 'posted-content',
            created: { 'date-parts': [[2024, 2, 9]], 'date-time': '2024-02-09T03:15:12Z', timestamp: 1707448512000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms'],
            prefix: '10.1101',
            author: [
              { given: 'Sean J.', family: 'Ihn', sequence: 'first', affiliation: [] },
              { given: 'Laura', family: 'Farlam-Williams', sequence: 'additional', affiliation: [] },
              { given: 'Alexander F.', family: 'Palazzo', sequence: 'additional', affiliation: [] },
              { given: 'Hyun O.', family: 'Lee', sequence: 'additional', affiliation: [] },
            ],
            member: '246',
            'container-title': [],
            'original-title': [],
            link: [
              {
                URL: 'https://syndication.highwire.org/content/doi/10.1101/2024.02.07.578830',
                'content-type': 'unspecified',
                'content-version': 'vor',
                'intended-application': 'similarity-checking',
              },
            ],
            deposited: { 'date-parts': [[2024, 2, 12]], 'date-time': '2024-02-12T18:25:24Z', timestamp: 1707762324000 },
            score: 1,
            resource: { primary: { URL: 'http://biorxiv.org/lookup/doi/10.1101/2024.02.07.578830' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2024, 2, 8]] },
            'references-count': 68,
            URL: 'http://dx.doi.org/10.1101/2024.02.07.578830',
            relation: {},
            published: { 'date-parts': [[2024, 2, 8]] },
            subtype: 'preprint',
          },
        },
      })
      .get(
        {
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.1101/2024.02.07.578830"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )
      .get('http://prereview.test/api/v2/preprints/doi-10.1101-2024.02.07.578830/rapid-reviews', {
        body: { data: [] },
      })

    await page.goto('/preprints/doi-10.1101-2024.02.07.578830')

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
  async ({ fetch, page }) => {
    fetch
      .get('https://api.crossref.org/works/10.1101%2F2024.02.07.578830', {
        body: {
          status: 'ok',
          'message-type': 'work',
          'message-version': '1.0.0',
          message: {
            institution: [{ name: 'bioRxiv' }],
            indexed: { 'date-parts': [[2024, 3, 2]], 'date-time': '2024-03-02T00:34:28Z', timestamp: 1709339668744 },
            posted: { 'date-parts': [[2024, 2, 8]] },
            'group-title': 'Cell Biology',
            'reference-count': 68,
            publisher: 'Cold Spring Harbor Laboratory',
            'content-domain': { domain: [], 'crossmark-restriction': false },
            'short-container-title': [],
            accepted: { 'date-parts': [[2024, 2, 8]] },
            abstract:
              '<jats:title>Abstract</jats:title><jats:p>Stress granules are cytoplasmic membraneless organelles that sequester proteins and non-translating mRNAs in response to various stressors. To assess the contributions of mRNA and RNA-binding proteins to stress granule formation, we use microinjection to deliver protein-free mRNA into the cytoplasm in a controlled manner. We demonstrate that mRNAs trigger stress granule formation through two mechanisms that are enhanced by the presence of G3BP1 and G3BP2. Low concentrations of<jats:italic>in vitro</jats:italic>transcribed mRNA activated protein kinase R (PKR), leading to phosphorylation and inhibition of the eukaryotic translation initiation factor eIF2\u03b1 and stress granule formation. This was inhibited by replacing uridine with pseudouridine in the mRNA or by treating it with RNase III, which cleaves double-stranded RNA. High concentrations of mRNA triggered stress granule formation by a mechanism that was independent of PKR and enhanced by G3BP1/2, highlighting the importance of both protein-free mRNA and RNA-binding proteins in stress granule formation.</jats:p><jats:sec><jats:title>Graphical Abstract/Model</jats:title><jats:fig id="ufig1" position="float" orientation="portrait" fig-type="figure"><jats:graphic xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="578830v1_ufig1" position="float" orientation="portrait" /></jats:fig></jats:sec><jats:sec><jats:title>Summary</jats:title><jats:p>Microinjected mRNA induces stress granules in mammalian cells by two G3BP1/2-dependent mechanisms: one requires the stress-sensing protein kinase PKR to phosphorylate the translation initiation factor eIF2\u03b1, and the other is independent of PKR and phospho-eIF2\u03b1 and acts when the cytoplasmic concentration of ribosome-free mRNA is increased acutely.</jats:p></jats:sec>',
            DOI: '10.1101/2024.02.07.578830',
            type: 'posted-content',
            created: { 'date-parts': [[2024, 2, 9]], 'date-time': '2024-02-09T03:15:12Z', timestamp: 1707448512000 },
            source: 'Crossref',
            'is-referenced-by-count': 0,
            title: ['Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms'],
            prefix: '10.1101',
            author: [
              { given: 'Sean J.', family: 'Ihn', sequence: 'first', affiliation: [] },
              { given: 'Laura', family: 'Farlam-Williams', sequence: 'additional', affiliation: [] },
              { given: 'Alexander F.', family: 'Palazzo', sequence: 'additional', affiliation: [] },
              { given: 'Hyun O.', family: 'Lee', sequence: 'additional', affiliation: [] },
            ],
            member: '246',
            'container-title': [],
            'original-title': [],
            link: [
              {
                URL: 'https://syndication.highwire.org/content/doi/10.1101/2024.02.07.578830',
                'content-type': 'unspecified',
                'content-version': 'vor',
                'intended-application': 'similarity-checking',
              },
            ],
            deposited: { 'date-parts': [[2024, 2, 12]], 'date-time': '2024-02-12T18:25:24Z', timestamp: 1707762324000 },
            score: 1,
            resource: { primary: { URL: 'http://biorxiv.org/lookup/doi/10.1101/2024.02.07.578830' } },
            subtitle: [],
            'short-title': [],
            issued: { 'date-parts': [[2024, 2, 8]] },
            'references-count': 68,
            URL: 'http://dx.doi.org/10.1101/2024.02.07.578830',
            relation: {},
            published: { 'date-parts': [[2024, 2, 8]] },
            subtype: 'preprint',
          },
        },
      })
      .get(
        {
          url: 'http://zenodo.test/api/communities/prereview-reviews/records',
          query: { q: 'related.identifier:"10.1101/2024.02.07.578830"' },
        },
        { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
      )
      .get('http://prereview.test/api/v2/preprints/doi-10.1101-2024.02.07.578830/rapid-reviews', {
        body: { data: [] },
      })

    await page.goto('/preprints/doi-10.1101-2024.02.07.578830/request-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.goto('/preprints/doi-10.1101-2024.02.07.578830')
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
    await page.goto('/preprints/doi-10.1101-2024.02.07.578830/request-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your request')

    await page.goBack()

    await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
  },
)
