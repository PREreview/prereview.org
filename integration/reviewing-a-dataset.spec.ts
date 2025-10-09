import { Duration } from 'effect'
import * as StatusCodes from '../src/StatusCodes.ts'
import {
  areLoggedIn,
  test as baseTest,
  canLogIn,
  canReviewDatasets,
  expect,
  useCockroachDB,
  willPublishADatasetReview,
} from './base.ts'

const test = baseTest.extend(useCockroachDB).extend(canReviewDatasets)

test.extend(canLogIn).extend(willPublishADatasetReview)('can review a dataset', async ({ javaScriptEnabled, page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Review a dataset' }).click()
  await page.getByLabel('Which dataset are you reviewing?').fill('10.5061/dryad.wstqjq2n3')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('main')).toContainText('We will ask you to log in')

  await page.getByRole('button', { name: 'Start now' }).click()

  await page.getByLabel('Fair', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('Partly', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('I don’t know', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('Partly', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('I don’t know', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('Somewhat consequential', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page
    .getByLabel(
      'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? (optional)',
    )
    .fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your PREreview')

  await page.getByRole('button', { name: 'Publish PREreview' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('We’re publishing your PREreview')

  if (javaScriptEnabled) {
    await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible()

    await page.getByRole('link', { name: 'Continue' }).click()
  } else {
    await expect(async () => {
      await page.getByRole('link', { name: 'Reload page' }).click()

      await expect(page.getByRole('link', { name: 'Reload page' })).not.toBeVisible()
    }).toPass()
  }

  await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
  await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')

  await page.getByRole('link', { name: 'See your review' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Structured PREreview of Metadata collected from 500 articles in the field of ecology and evolution',
  )
  await expect(page.getByRole('main')).toContainText('by Josiah Carberry')
  await expect(page.getByRole('main')).toContainText('How would you rate the quality of this data set? Fair')
  await expect(page.getByRole('main')).toContainText('Does this dataset follow FAIR and CARE principles? Partly')
  await expect(page.getByRole('main')).toContainText('Does the dataset have enough metadata? Yes')
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate? No',
  )
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset show signs of alteration beyond instances of likely human error, such as censorship, deletion, or redaction, that are not accounted for otherwise? I don’t know',
  )
  await expect(page.getByRole('main')).toContainText(
    'Is the dataset well-suited to support its stated research purpose? Partly',
  )
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset support the researcher’s stated conclusions? Yes',
  )
  await expect(page.getByRole('main')).toContainText(
    'Is the dataset granular enough to be a reliable standard of measurement? No',
  )
  await expect(page.getByRole('main')).toContainText('Is the dataset relatively error-free? I don’t know')
  await expect(page.getByRole('main')).toContainText(
    'Is this dataset likely to be of interest to researchers in its corresponding field of study, to most researchers, or to the general public? How consequential is it likely to seem to that audience or those audiences? Somewhat consequential',
  )
  await expect(page.getByRole('main')).toContainText('Is this dataset ready to be shared? Yes')
  await expect(page.getByRole('main')).toContainText(
    'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
  await expect(page.getByRole('main')).toContainText(
    'Competing interests The author declares that they have no competing interests.',
  )

  await page.getByRole('link', { name: 'Back to all reviews' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'PREreviews of Metadata collected from 500 articles in the field of ecology and evolution',
  )
  await expect(page.getByRole('article', { name: 'PREreview by Josiah Carberry' })).toBeVisible()
})

test('can choose a locale before starting', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Avalie um conjunto de dados')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a PREreview',
  async ({ page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Fair', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()

    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Does this dataset follow FAIR and CARE principles?',
    )
  },
)

test('when the dataset is not found', async ({ fetch, page }) => {
  await page.goto('/review-a-dataset', { waitUntil: 'commit' })
  await page.getByLabel('Which dataset are you reviewing?').fill('10.5061/this-should-not-find-anything')

  fetch.get('https://api.datacite.org/dois/10.5061%2Fthis-should-not-find-anything', { status: StatusCodes.NotFound })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t know this dataset')
})

test('when it is not a dataset', async ({ fetch, page }) => {
  await page.goto('/review-a-dataset', { waitUntil: 'commit' })
  await page.getByLabel('Which dataset are you reviewing?').fill('10.5061/not-a-dataset')

  fetch.get('https://api.datacite.org/dois/10.5061%2Fnot-a-dataset', {
    body: {
      data: {
        id: '10.5281/zenodo.1001813',
        type: 'dois',
        attributes: {
          doi: '10.5281/zenodo.1001813',
          prefix: '10.5281',
          suffix: 'zenodo.1001813',
          identifiers: [{ identifier: '28945194', identifierType: 'PMID' }],
          alternateIdentifiers: [{ alternateIdentifierType: 'PMID', alternateIdentifier: '28945194' }],
          creators: [
            {
              name: 'Keine, Christian',
              nameType: 'Personal',
              givenName: 'Christian',
              familyName: 'Keine',
              affiliation: ['Carver College of Medicine, University of Iowa, Iowa City, USA'],
              nameIdentifiers: [
                { nameIdentifier: 'https://orcid.org/0000-0002-8953-2593', nameIdentifierScheme: 'ORCID' },
              ],
            },
            {
              name: 'Rübsamen, Rudolf',
              nameType: 'Personal',
              givenName: 'Rudolf',
              familyName: 'Rübsamen',
              affiliation: ['University of Leipzig, Leipzig, Germany'],
              nameIdentifiers: [],
            },
            {
              name: 'Englitz, Bernhard',
              nameType: 'Personal',
              givenName: 'Bernhard',
              familyName: 'Englitz',
              affiliation: ['Donders Center for Neuroscience, Radboud University, Nijmegen, The Netherlands'],
              nameIdentifiers: [],
            },
          ],
          titles: [
            {
              title:
                'Signal Integration At Spherical Bushy Cells Enhances Representation Of Temporal Structure But Limits Its Range.',
            },
          ],
          publisher: 'Zenodo',
          container: {},
          publicationYear: 2017,
          subjects: [
            { subject: 'Inhibition' },
            { subject: 'Cochlear Nucleus' },
            { subject: 'Spherical Bushy Cells' },
            { subject: 'Stimulus reconstruction' },
            { subject: 'Sound Localization' },
          ],
          contributors: [],
          dates: [{ date: '2017-09-25', dateType: 'Issued' }],
          language: 'en',
          types: {
            ris: 'JOUR',
            bibtex: 'article',
            citeproc: 'article-journal',
            schemaOrg: 'ScholarlyArticle',
            resourceType: 'Journal article',
            resourceTypeGeneral: 'Text',
          },
          relatedIdentifiers: [
            { relationType: 'IsVersionOf', relatedIdentifier: '10.5281/zenodo.1001812', relatedIdentifierType: 'DOI' },
          ],
          relatedItems: [],
          sizes: [],
          formats: [],
          version: null,
          rightsList: [
            { rights: 'Creative Commons Attribution 4.0', rightsUri: 'https://creativecommons.org/licenses/by/4.0' },
            { rights: 'Open Access', rightsUri: 'info:eu-repo/semantics/openAccess' },
          ],
          descriptions: [
            {
              description:
                'Neuronal inhibition is crucial for temporally precise and reproducible signaling in the auditory brainstem. We showed previously (Keine et al., 2016) that for various synthetic stimuli, spherical bushy cell (SBC) activity in the Mongolian gerbil is rendered sparser and more reliable by subtractive inhibition. Employing environmental stimuli, we demonstrate here that the inhibitory gain control becomes even more effective, keeping stimulated response rates equal to spontaneous ones. However, what are the costs of this modulation? We performed dynamic stimulus reconstructions based on neural population responses for auditory nerve (ANF) input and SBC output to assess the influence of inhibition on signal representation. Compared to ANFs, reconstructions of natural stimuli based on SBC responses were temporally more precise, but the match between acoustic and represented signal decreased. Hence, for natural sounds, inhibition at SBCs plays an even stronger role in achieving sparse and reproducible neuronal activity, while compromising general signal representation.',
              descriptionType: 'Abstract',
            },
            {
              description: 'This article has been published in eLife on September 25, 2017 [DOI: 10.7554/eLife.29639]',
              descriptionType: 'Other',
            },
          ],
          geoLocations: [],
          fundingReferences: [],
          url: 'https://zenodo.org/record/1001813',
          contentUrl: null,
          metadataVersion: 1,
          schemaVersion: 'http://datacite.org/schema/kernel-4',
          source: null,
          isActive: true,
          state: 'findable',
          reason: null,
          viewCount: 0,
          viewsOverTime: [],
          downloadCount: 0,
          downloadsOverTime: [],
          referenceCount: 0,
          citationCount: 0,
          citationsOverTime: [],
          partCount: 0,
          partOfCount: 0,
          versionCount: 0,
          versionOfCount: 1,
          created: '2017-10-04T00:02:51.000Z',
          registered: '2017-10-04T00:02:52.000Z',
          published: '2017',
          updated: '2020-09-19T01:10:57.000Z',
        },
        relationships: {
          client: { data: { id: 'cern.zenodo', type: 'clients' } },
          provider: { data: { id: 'cern', type: 'providers' } },
          media: { data: { id: '10.5281/zenodo.1001813', type: 'media' } },
          references: { data: [] },
          citations: { data: [] },
          parts: { data: [] },
          partOf: { data: [] },
          versions: { data: [] },
          versionOf: { data: [{ id: '10.5281/zenodo.1001812', type: 'dois' }] },
        },
      },
    },
  })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we only support datasets')
})

test('might not load the dataset in time', async ({ fetch, page }) => {
  await page.goto('/review-a-dataset', { waitUntil: 'commit' })
  await page.getByLabel('Which dataset are you reviewing?').fill('10.5061/this-should-take-too-long')

  fetch.get(
    'https://api.datacite.org/dois/10.5061%2Fthis-should-take-too-long',
    { status: StatusCodes.NotFound },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test('when the DOI is not supported', async ({ page }) => {
  await page.goto('/review-a-dataset', { waitUntil: 'commit' })
  await page.getByLabel('Which dataset are you reviewing?').fill('10.5555/12345678')

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this DOI')
})

test('when the URL is not supported', async ({ page }) => {
  await page.goto('/review-a-dataset', { waitUntil: 'commit' })
  await page.getByLabel('Which dataset are you reviewing?').fill('http://example.com')

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this URL')
})

test.extend(canLogIn).extend(areLoggedIn)("aren't told about ORCID when already logged in", async ({ page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

  await expect(page.getByRole('main')).not.toContainText('ORCID')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How would you rate the quality of this data set?')
})

test.extend(canLogIn).extend(areLoggedIn)('can change your answers before publishing', async ({ page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Fair', { exact: true }).check()
  await page.getByLabel('Why is it fair quality?').fill('Cras lobortis quam vitae.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly', { exact: true }).check()
  await page
    .getByLabel('How does it partly follow the principles?')
    .fill('Nullam vestibulum neque efficitur porta ornare.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Somewhat consequential', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  const details = page.getByRole('region', { name: 'Your details' })
  const review = page.getByRole('region', { name: 'Your review' })

  await expect(details).toContainText('Published name Josiah Carberry')
  await expect(details).toContainText('Competing interests None declared')
  await expect(review).toContainText('How would you rate the quality of this data set? Fair Cras lobortis quam vitae.')
  await expect(review).toContainText(
    'Does this dataset follow FAIR and CARE principles? Partly Nullam vestibulum neque efficitur porta ornare.',
  )
  await expect(review).toContainText('Does the dataset have enough metadata? Partly')
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate? Partly',
  )
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset show signs of alteration beyond instances of likely human error, such as censorship, deletion, or redaction, that are not accounted for otherwise? Partly',
  )
  await expect(page.getByRole('main')).toContainText(
    'Is the dataset well-suited to support its stated research purpose? Partly',
  )
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset support the researcher’s stated conclusions? Partly',
  )
  await expect(page.getByRole('main')).toContainText(
    'Is the dataset granular enough to be a reliable standard of measurement? Partly',
  )
  await expect(page.getByRole('main')).toContainText('Is the dataset relatively error-free? Partly')
  await expect(page.getByRole('main')).toContainText(
    'Is this dataset likely to be of interest to researchers in its corresponding field of study, to most researchers, or to the general public? How consequential is it likely to seem to that audience or those audiences? Somewhat consequential',
  )
  await expect(page.getByRole('main')).toContainText('Is this dataset ready to be shared? Yes')
  await expect(page.getByRole('main')).toContainText(
    'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? No answer',
  )

  await page.getByRole('link', { name: 'Change your published name' }).click()

  await page.getByLabel('Orange Panda').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(details).toContainText('Published name Orange Panda')

  await page.getByRole('link', { name: 'Change your competing interests' }).click()

  await page.getByLabel('Yes').check()
  await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(details).toContainText('Competing interests Maecenas sed dapibus massa.')

  await page.getByRole('link', { name: 'Change how you rate the quality' }).click()

  await page.getByLabel('Why is it fair quality?').clear()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('How would you rate the quality of this data set? Fair')
  await expect(review).not.toContainText('Fair Cras lobortis quam vitae.')

  await page.getByRole('link', { name: 'Change how you rate the quality' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('How would you rate the quality of this data set? I don’t know')

  await page.getByRole('link', { name: 'Change if the dataset follows FAIR and CARE principles' }).click()

  await page.getByLabel('How does it partly follow the principles?').clear()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('Does this dataset follow FAIR and CARE principles? Partly')
  await expect(review).not.toContainText('Partly Nullam vestibulum neque efficitur porta ornare.')

  await page.getByRole('link', { name: 'Change if the dataset follows FAIR and CARE principles' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('Does this dataset follow FAIR and CARE principles? I don’t know')

  await page.getByRole('link', { name: 'Change if the dataset has enough metadata' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('Does the dataset have enough metadata? I don’t know')

  await page
    .getByRole('link', { name: 'Change if the dataset includes a way to list or track changes or versions' })
    .click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText(
    'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate? I don’t know',
  )

  await page.getByRole('link', { name: 'Change if the dataset shows signs of alteration' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Does this dataset show signs of alteration beyond instances of likely human error, such as censorship, deletion, or redaction, that are not accounted for otherwise? I don’t know',
  )

  await page.getByRole('link', { name: 'Change if the dataset is well-suited' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Is the dataset well-suited to support its stated research purpose? I don’t know',
  )

  await page.getByRole('link', { name: 'Change if the dataset supports the conclusions' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Does this dataset support the researcher’s stated conclusions? I don’t know',
  )

  await page.getByRole('link', { name: 'Change if the dataset is granular enough' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Is the dataset granular enough to be a reliable standard of measurement? I don’t know',
  )

  await page.getByRole('link', { name: 'Change if the dataset is relatively error-free' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Is the dataset relatively error-free? I don’t know')

  await page.getByRole('link', { name: 'Change how consequential the dataset is likely to seem' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Is this dataset likely to be of interest to researchers in its corresponding field of study, to most researchers, or to the general public? How consequential is it likely to seem to that audience or those audiences? I don’t know',
  )

  await page.getByRole('link', { name: 'Change if the dataset is ready to be shared' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Is this dataset ready to be shared? I don’t know')

  await page.getByRole('link', { name: 'Change if the dataset is missing anything' }).click()

  await page
    .getByLabel(
      'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? (optional)',
    )
    .fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )
})

test.extend(canLogIn).extend(areLoggedIn)('can go back through the form', async ({ page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Fair', { exact: true }).check()
  await page.getByLabel('Why is it fair quality?').fill('Cras lobortis quam vitae.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes').check()
  await page.getByLabel('How does it follow the principles?').fill('Nullam vestibulum neque efficitur porta ornare.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I don’t know', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Somewhat consequential', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page
    .getByLabel(
      'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? (optional)',
    )
    .fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes').check()
  await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

  await page.goBack()

  await expect(page.getByLabel('Yes')).toBeChecked()
  await expect(page.getByLabel('What are they?')).toHaveValue('Maecenas sed dapibus massa.')

  await page.goBack()

  await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

  await page.goBack()

  await expect(
    page.getByLabel(
      'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? (optional)',
    ),
  ).toHaveValue('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

  await page.goBack()

  await expect(page.getByLabel('Yes', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('Somewhat consequential')).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('Partly', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('No', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('I don’t know', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('Yes', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('Partly', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('No', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('I don’t know')).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('Yes')).toBeChecked()
  await expect(page.getByLabel('How does it follow the principles?')).toHaveValue(
    'Nullam vestibulum neque efficitur porta ornare.',
  )

  await page.goBack()

  await expect(page.getByLabel('Fair', { exact: true })).toBeChecked()
  await page.getByLabel('Why is it fair quality?').fill('Cras lobortis quam vitae.')

  await page.goBack()

  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
})

test.extend(canLogIn).extend(areLoggedIn)('see existing values when going back a step', async ({ page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Fair', { exact: true }).check()
  await page.getByLabel('Why is it fair quality?').fill('Cras lobortis quam vitae.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes').check()
  await page.getByLabel('How does it follow the principles?').fill('Nullam vestibulum neque efficitur porta ornare.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Somewhat consequential', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page
    .getByLabel(
      'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? (optional)',
    )
    .fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes').check()
  await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Yes')).toBeChecked()
  await expect(page.getByLabel('What are they?')).toHaveValue('Maecenas sed dapibus massa.')

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(
    page.getByLabel(
      'What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways? (optional)',
    ),
  ).toHaveValue('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Yes', { exact: true })).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Somewhat consequential')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Partly', { exact: true })).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('No', { exact: true })).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('I don’t know')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Yes')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Partly')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('No', { exact: true })).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('I don’t know')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Yes')).toBeChecked()
  await expect(page.getByLabel('How does it follow the principles?')).toHaveValue(
    'Nullam vestibulum neque efficitur porta ornare.',
  )

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Fair', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Why is it fair quality?')).toHaveValue('Cras lobortis quam vitae.')
  await expect(page.getByRole('link', { name: 'Back' })).not.toBeVisible()
})

test.extend(canLogIn).extend(areLoggedIn)('have to enter a DOI', async ({ javaScriptEnabled, page }) => {
  await page.goto('/review-a-dataset', { waitUntil: 'commit' })

  await page.getByRole('button', { name: 'Continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('Which dataset are you reviewing?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter the dataset DOI or URL' }).click()

  await expect(page.getByLabel('Which dataset are you reviewing?')).toBeFocused()

  await page.getByLabel('Which dataset are you reviewing?').fill('not-a-DOI')
  await page.getByRole('button', { name: 'Continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('Which dataset are you reviewing?')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Which dataset are you reviewing?')).toHaveValue('not-a-DOI')

  await page.getByRole('link', { name: 'Enter a dataset DOI or URL' }).click()

  await expect(page.getByLabel('Which dataset are you reviewing?')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)('have to rate the quality', async ({ javaScriptEnabled, page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.goto(`${page.url()}/../rate-the-quality`, { waitUntil: 'commit' })

  if (!javaScriptEnabled) {
    await page.getByLabel('Why is it excellent quality?').fill('   \n Cras lobortis quam vitae. ')
  }

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByRole('group', { name: 'How would you rate the quality of this data set?' })).toHaveAttribute(
    'aria-invalid',
    'true',
  )

  await page.getByRole('link', { name: 'Select how you rate the quality' }).click()

  await expect(page.getByLabel('Excellent', { exact: true })).toBeFocused()
  if (!javaScriptEnabled) {
    await expect(page.getByLabel('Why is it excellent quality?')).toHaveValue('   \n Cras lobortis quam vitae. ')
  }
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset follows FAIR and CARE principles',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../follows-fair-and-care-principles`, { waitUntil: 'commit' })

    if (!javaScriptEnabled) {
      await page
        .getByLabel('How does it follow the principles?')
        .fill('   \n Nullam vestibulum neque efficitur porta ornare. ')
    }

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Does this dataset follow FAIR and CARE principles?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select if the dataset follows FAIR and CARE principles' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()

    if (!javaScriptEnabled) {
      await expect(page.getByLabel('How does it follow the principles?')).toHaveValue(
        '   \n Nullam vestibulum neque efficitur porta ornare. ',
      )
    }
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset has enough metadata',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../has-enough-metadata`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Does the dataset have enough metadata?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select if the dataset has enough metadata' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset has tracked changes',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../has-tracked-changes`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', { name: 'Select if the dataset has a way to list or track changes or versions' })
      .click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset has data censored or deleted',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../has-data-censored-or-deleted`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Does this dataset show signs of alteration beyond instances of likely human error, such as censorship, deletion, or redaction, that are not accounted for otherwise?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select if the dataset shows signs of alteration' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset is appropriate for this kind of research',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../is-appropriate-for-this-kind-of-research`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Is the dataset well-suited to support its stated research purpose?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select if the dataset is well-suited' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset supports related conclusions',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../supports-related-conclusions`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Does this dataset support the researcher’s stated conclusions?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select if the dataset supports the conclusions' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset is detailed enough',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../is-detailed-enough`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Is the dataset granular enough to be a reliable standard of measurement?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select if the dataset is granular enough' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset is error-free',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../is-error-free`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Is the dataset relatively error-free?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select if the dataset is relatively error-free' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset matters to its audience',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../matters-to-its-audience`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Is this dataset likely to be of interest to researchers in its corresponding field of study, to most researchers, or to the general public? How consequential is it likely to seem to that audience or those audiences?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select how consequential is it likely to seem' }).click()

    await expect(page.getByLabel('Very consequential')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset is ready to be shared',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../is-ready-to-be-shared`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Is this dataset ready to be shared?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select if the dataset is ready to be shared' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to choose a persona', async ({ javaScriptEnabled, page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.goto(`${page.url()}/../choose-name`, { waitUntil: 'commit' })

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
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to declare competing interests',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../declare-competing-interests`, { waitUntil: 'commit' })

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
