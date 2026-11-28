import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Events from '../src/Domain/Events/index.ts'
import { BiorxivPreprintId } from '../src/Domain/Preprints/index.ts'
import { html } from '../src/html.ts'
import { Doi } from '../src/types/Doi.ts'
import { Name } from '../src/types/Name.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { Pseudonym } from '../src/types/Pseudonym.ts'
import { areLoggedIn, canLogIn, expect, isASlackUser, seedEvents, test } from './base.ts'

test.extend(
  seedEvents(
    new Events.PrereviewerRegistered({
      orcidId: OrcidId('0000-0002-2695-5951'),
      pseudonym: Pseudonym('Orange Panda'),
      registeredAt: Temporal.Now.instant(),
    }),
    new Events.PreprintReviewImported({
      authors: [
        { _tag: 'PublicPersona', name: Option.some(Name('CJ San Felipe')), orcidId: OrcidId('0000-0002-2695-5951') },
      ],
      otherAuthors: 0,
      doi: Doi('10.5281/zenodo.7747129'),
      id: 7747129,
      license: 'CC-BY-4.0',
      published: Temporal.PlainDate.from('2022-07-05'),
      preprint: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
      live: false,
      useOfAi: { _tag: 'NotAnswered' },
      competingInterests: { _tag: 'No' },
      language: 'en',
      content: { _tag: 'Full', text: html`<p>Some review.</p>` },
      topics: [],
    }),
  ),
)('can find and view a profile', async ({ fetch, page }) => {
  fetch.get('http://api.orcid.test/v3.0/0000-0002-2695-5951/personal-details', {
    body: { name: { 'given-names': { value: 'CJ' }, 'family-name': { value: 'San Felipe' }, 'credit-name': null } },
  })

  await page.goto('/reviews/7747129', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'CJ San Felipe' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CJ San Felipe')
  await expect(
    page.getByRole('link', {
      name: 'CJ San Felipe reviewed The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    }),
  ).toBeVisible()
})

test.extend(canLogIn).extend(areLoggedIn).extend(isASlackUser)('can view my profile', async ({ fetch, page }) => {
  await page.goto('/my-details', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Connect Slack account' }).click()
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByRole('link', { name: 'Enter preference for review requests' }).click()
  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Set preference-for-review-requests visibility' }).click()
  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Enter career stage' }).click()
  await page.getByLabel('Mid').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Set career-stage visibility' }).click()
  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Enter research interests' }).click()
  await page
    .getByLabel('What are your research interests?')
    .fill('Nunc vestibulum sapien eu magna elementum consectetur.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Set research-interests visibility' }).click()
  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Enter location' }).click()
  await page.getByLabel('Where are you based?').fill('Vivamus in convallis urna.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Set location visibility' }).click()
  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Enter languages' }).click()
  await page.getByLabel('What languages can you review in?').fill('English and Spanish')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Set languages visibility' }).click()
  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  fetch.getOnce('http://api.orcid.test/v3.0/0000-0002-1825-0097/personal-details', {
    body: { name: { 'given-names': { value: 'Josiah' }, 'family-name': { value: 'Carberry' }, 'credit-name': null } },
  })

  await page.getByRole('link', { name: 'View public profile' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Josiah Carberry')
  await expect(page.getByRole('main')).toContainText('ORCID iD 0000-0002-1825-0097')
  await expect(page.getByRole('main')).toContainText('Slack Community name jcarberry')
  await expect(page.getByRole('main')).toContainText('Career stage Mid')
  await expect(page.getByRole('main')).toContainText(
    'Research interests Nunc vestibulum sapien eu magna elementum consectetur.',
  )
  await expect(page.getByRole('main')).toContainText('Location Vivamus in convallis urna.')
  await expect(page.getByRole('main')).toContainText('Languages English and Spanish')
  await expect(page.getByRole('main')).toContainText('Josiah Carberry is happy to take requests for a PREreview.')
})

test.extend(
  seedEvents(
    new Events.PrereviewerRegistered({
      orcidId: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Blue Sheep'),
      registeredAt: Temporal.Now.instant(),
    }),
    new Events.PreprintReviewImported({
      authors: [{ _tag: 'PseudonymPersona', orcidId: OrcidId('0000-0002-1825-0097') }],
      otherAuthors: 0,
      doi: Doi('10.5281/zenodo.7747129'),
      id: 7747129,
      license: 'CC-BY-4.0',
      published: Temporal.PlainDate.from('2022-07-05'),
      preprint: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
      live: false,
      useOfAi: { _tag: 'NotAnswered' },
      competingInterests: { _tag: 'No' },
      language: 'en',
      content: { _tag: 'Full', text: html`<p>Some review.</p>` },
      topics: [],
    }),
  ),
)("can find and view a pseduonym's profile", async ({ page }) => {
  await page.goto('/reviews/7747129', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'Blue Sheep' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blue Sheep')
  await expect(
    page.getByRole('link', {
      name: 'Blue Sheep reviewed The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    }),
  ).toBeVisible()
})

test.extend(canLogIn).extend(areLoggedIn)("can view my pseduonym's profile", async ({ page }) => {
  await page.goto('/my-details', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'View pseudonym profile' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orange Panda')
  await expect(page.getByRole('main')).toContainText('Orange Panda hasn’t published a PREreview yet.')
})

test.extend(
  seedEvents(
    new Events.PrereviewerRegistered({
      orcidId: OrcidId('0000-0002-6109-0367'),
      pseudonym: Pseudonym('Orange Panda'),
      registeredAt: Temporal.Now.instant(),
    }),
  ),
)('the list might be empty', async ({ fetch, page }) => {
  fetch.getOnce('http://api.orcid.test/v3.0/0000-0002-6109-0367/personal-details', {
    body: { name: { 'given-names': { value: 'Daniela' }, 'family-name': { value: 'Saderi' }, 'credit-name': null } },
  })

  await page.goto('/profiles/0000-0002-6109-0367', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Daniela Saderi')
  await expect(page.getByRole('main')).toContainText('Daniela Saderi hasn’t published a PREreview yet.')
})
