import { Temporal } from '@js-temporal/polyfill'
import { Array, Option } from 'effect'
import * as Events from '../src/Domain/Events/index.ts'
import { BiorxivPreprintId } from '../src/Domain/Preprints/index.ts'
import { type Html, html } from '../src/html.ts'
import { Doi } from '../src/types/Doi.ts'
import { Name } from '../src/types/Name.ts'
import { NonEmptyString } from '../src/types/NonEmptyString.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { Pseudonym } from '../src/types/Pseudonym.ts'
import type { TopicId } from '../src/types/Topic.ts'
import { Uuid } from '../src/types/Uuid.ts'
import { areLoggedIn, canLogIn, expect, prereviewWasRemoved, seedEvents, test } from './base.ts'

const lhcbm1Preprint = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const ptp1bPreprint = new BiorxivPreprintId({ value: Doi('10.1101/2023.02.28.529746') })

const asapbioMetabolismCrowd = Uuid('3e820d44-fdb3-4cba-aeb6-ac03fb23108e')

const reviewText = html`<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>`

const review = ({
  addendum,
  club,
  content = { _tag: 'Full', text: reviewText },
  id,
  preprint,
  published,
  topics = [],
}: {
  addendum?: Html
  club?: Uuid
  content?: Events.PreprintReviewImported['content']
  id: number
  preprint: BiorxivPreprintId
  published: Temporal.PlainDate
  topics?: ReadonlyArray<TopicId>
}) =>
  new Events.PreprintReviewImported({
    ...(addendum !== undefined ? { addendum } : {}),
    authors: [
      { _tag: 'PublicPersona', name: Option.some(Name('Josiah Carberry')), orcidId: OrcidId('0000-0002-1825-0097') },
    ],
    otherAuthors: 0,
    ...(club !== undefined ? { club } : {}),
    doi: Doi(`10.5281/zenodo.${id}`),
    id,
    license: 'CC-BY-4.0',
    published,
    preprint,
    live: false,
    useOfAi: { _tag: 'NotAnswered' },
    competingInterests: { _tag: 'No' },
    language: 'en',
    content,
    topics,
  })

test
  .extend(canLogIn)
  .extend(areLoggedIn)
  .extend(
    seedEvents(
      review({
        id: 7747129,
        preprint: ptp1bPreprint,
        published: Temporal.PlainDate.from('2023-03-17'),
        content: {
          _tag: 'Full',
          text: html`<p>PTP1b has been an attractive target for drug development due to ...</p>`,
        },
      }),
    ),
  )('can see my own PREreviews', async ({ javaScriptEnabled, page }) => {
  const menu = page.getByRole(javaScriptEnabled ? 'button' : 'link', { name: 'Menu' })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await menu.click()
  await page.getByRole('link', { name: 'My PREreviews' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My PREreviews')

  if (javaScriptEnabled) {
    await menu.click()

    await expect(page.getByRole('link', { name: 'My PREreviews' })).toHaveAttribute('aria-current', 'page')
  }

  await page
    .getByRole('link', {
      name: 'Josiah Carberry reviewed A conserved local structural motif controls the kinetics of PTP1B catalysis',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('an attractive target for drug development')
})

test.extend(
  seedEvents(review({ id: 1061864, preprint: lhcbm1Preprint, published: Temporal.PlainDate.from('2022-07-05') })),
)('can find and view a review', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Josiah Carberry' })
    .getByRole('link', { name: 'Read the PREreview by Josiah Carberry' })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test.extend(
  seedEvents(
    review({
      id: 1061864,
      preprint: lhcbm1Preprint,
      published: Temporal.PlainDate.from('2022-07-05'),
      content: {
        _tag: 'Structured',
        introductionMatches: {
          answer: 'yes',
          comment: Option.some(NonEmptyString('The aim is clearly explained, and it matches up with what follows.')),
        },
        methodsAppropriate: { answer: 'skip', comment: Option.none() },
        conclusionsSupported: { answer: 'skip', comment: Option.none() },
        dataPresentation: { answer: 'skip', comment: Option.none() },
        findingsNextSteps: { answer: 'skip', comment: Option.none() },
        advancingKnowledge: { answer: 'skip', comment: Option.none() },
        languageEditing: { answer: 'no', comment: Option.none() },
        wouldRecommend: { answer: 'yes-but', comment: Option.none() },
        readyForAttention: { answer: 'yes-needs-minor-changes', comment: Option.none() },
      },
    }),
  ),
)('can find and view a question-based review', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Josiah Carberry' })
    .getByRole('link', { name: 'Read the PREreview by Josiah Carberry' })
    .click()

  await expect(page.getByRole('main')).toContainText(
    'Does the introduction explain the objective of the research presented in the preprint?',
  )
})

test.extend(
  seedEvents(
    review({ id: 1061864, preprint: lhcbm1Preprint, published: Temporal.PlainDate.from('2022-07-05') }),
    new Events.PrereviewerRegistered({
      orcidId: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
      registeredAt: Temporal.Instant.from('2022-07-01T09:00:00Z'),
    }),
    new Events.CommentWasStarted({
      commentId: Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
      prereviewId: 1061864,
      authorId: OrcidId('0000-0002-1825-0097'),
    }),
    new Events.CommentWasEntered({
      commentId: Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
      comment: html`<p>... some comment text ...</p>`,
    }),
    new Events.PersonaForCommentWasChosen({
      commentId: Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
      persona: 'pseudonym',
    }),
    new Events.CompetingInterestsForCommentWereDeclared({
      commentId: Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
      competingInterests: Option.none(),
    }),
    new Events.CommentWasAssignedADoi({
      commentId: Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
      id: 1061866,
      doi: Doi('10.5281/zenodo.1061866'),
    }),
    new Events.CommentWasPublished({
      commentId: Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8'),
      publishedAt: Temporal.Instant.from('2022-07-04T09:00:00Z'),
    }),
  ),
)('can find and view comments to a review', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Josiah Carberry' })
    .getByRole('link', { name: 'Read the PREreview by Josiah Carberry' })
    .click()

  await expect(page.getByRole('article', { name: 'Comments', exact: true })).toContainText('some comment text')
})

test.extend(
  seedEvents(
    review({
      id: 1061864,
      preprint: lhcbm1Preprint,
      published: Temporal.PlainDate.from('2022-07-05'),
      club: asapbioMetabolismCrowd,
    }),
  ),
)("can find and view a review that's part of a Club", async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Josiah Carberry of ASAPbio Metabolism Crowd' })
    .getByRole('link', { name: 'Read the PREreview by Josiah Carberry of ASAPbio Metabolism Crowd' })
    .click()

  await expect(page.getByRole('main')).toContainText('of ASAPbio Metabolism Crowd')
})

test.extend(
  seedEvents(review({ id: 7747129, preprint: ptp1bPreprint, published: Temporal.PlainDate.from('2023-03-17') })),
)('can view a recent review', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page
    .getByRole('region', { name: 'Recent PREreviews' })
    .getByRole('link', {
      name: 'Josiah Carberry reviewed A conserved local structural motif controls the kinetics of PTP1B catalysis',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test.extend(
  seedEvents(
    review({
      id: 7820084,
      preprint: lhcbm1Preprint,
      published: Temporal.PlainDate.from('2023-04-12'),
      club: asapbioMetabolismCrowd,
    }),
  ),
)("can view a recent review that's part of a Club", async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page
    .getByRole('region', { name: 'Recent PREreviews' })
    .getByRole('link', {
      name: 'Josiah Carberry of ASAPbio Metabolism Crowd reviewed The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('of ASAPbio Metabolism Crowd')
  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test.extend(
  seedEvents(
    review({
      id: 7747129,
      preprint: ptp1bPreprint,
      published: Temporal.PlainDate.from('2023-03-17'),
      addendum: html`<p>Some change.</p>`,
    }),
    ...Array.makeBy(5, i =>
      review({
        id: 1061864 + i,
        preprint: lhcbm1Preprint,
        published: Temporal.PlainDate.from('2023-04-01').add({ days: i }),
      }),
    ),
  ),
)('can view an older review', async ({ javaScriptEnabled, page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  await expect(page).toHaveTitle(/Recent PREreviews \(page 1\)/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recent PREreviews')
  await expect(page.getByRole('link', { name: 'Older' })).toHaveAttribute('rel', 'next')

  if (javaScriptEnabled) {
    await page.getByRole('button', { name: 'Menu' }).click()

    await expect(page.getByRole('link', { name: 'Reviews', exact: true })).toHaveAttribute('aria-current', 'page')
  }

  await page.getByRole('link', { name: 'Older' }).click()

  await expect(page).toHaveTitle(/Recent PREreviews \(page 2\)/)
  await expect(page.getByRole('link', { name: 'Newer' })).toHaveAttribute('rel', 'prev')

  await page
    .getByRole('link', {
      name: 'Josiah Carberry reviewed A conserved local structural motif controls the kinetics of PTP1B catalysis',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
  await expect(page.getByRole('main')).toContainText('Addendum Some change.')
})

test.extend(
  seedEvents(
    review({
      id: 7820084,
      preprint: lhcbm1Preprint,
      published: Temporal.PlainDate.from('2023-04-12'),
      club: asapbioMetabolismCrowd,
    }),
  ),
)("can view an older review that's part of a Club", async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recent PREreviews')

  await page
    .getByRole('link', {
      name: 'Josiah Carberry of ASAPbio Metabolism Crowd reviewed The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('of ASAPbio Metabolism Crowd')
  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test.extend(
  seedEvents(review({ id: 1061864, preprint: lhcbm1Preprint, published: Temporal.PlainDate.from('2022-07-05') })),
)('can view an older review in a specific language', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  const filters = page.getByRole('search', { name: 'Filter' })

  await expect(page).toHaveTitle(/Recent PREreviews \(page 1\)/)
  await expect(filters.getByLabel('Language').locator('[selected]')).toHaveText('Any')

  await filters.getByLabel('Language').selectOption('English')
  await filters.getByRole('button', { name: 'Filter results' }).click()

  await expect(page).toHaveTitle(/Recent PREreviews \(English, page 1\)/)
  await expect(filters.getByLabel('Language').locator('[selected]')).toHaveText('English')
})

test.extend(
  seedEvents(
    review({
      id: 1061864,
      preprint: lhcbm1Preprint,
      published: Temporal.PlainDate.from('2022-07-05'),
      topics: ['10031'],
    }),
  ),
)('can view an older review in a specific field', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  const filters = page.getByRole('search', { name: 'Filter' })

  await expect(page).toHaveTitle(/Recent PREreviews \(page 1\)/)
  await expect(filters.getByLabel('Field').locator('[selected]')).toHaveText('Any')

  await filters.getByLabel('Field').selectOption('Immunology and Microbiology')
  await filters.getByRole('button', { name: 'Filter results' }).click()

  await expect(page).toHaveTitle(/Recent PREreviews \(Immunology and Microbiology, page 1\)/)
  await expect(filters.getByLabel('Field').locator('[selected]')).toHaveText('Immunology and Microbiology')
})

test.extend(prereviewWasRemoved)('when the PREreview was removed', async ({ page }) => {
  await page.goto('/reviews/12345678', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PREreview removed')
})
