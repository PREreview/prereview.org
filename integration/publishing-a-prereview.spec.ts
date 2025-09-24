import { Doi } from 'doi-ts'
import { Duration, Function } from 'effect'
import type { MutableRedirectUri } from 'oauth2-mock-server'
import { URL } from 'url'
import { RecordC, RecordsC, type Record as ZenodoRecord } from 'zenodo-ts'
import * as StatusCodes from '../src/StatusCodes.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import {
  areLoggedIn,
  canAddMultipleAuthors,
  canLogIn,
  expect,
  hasAVerifiedEmailAddress,
  hasAnUnverifiedEmailAddress,
  test,
  updatesLegacyPrereview,
  waitForNotBusy,
  willPublishAReview,
} from './base.ts'

test.extend(canLogIn).extend(hasAVerifiedEmailAddress).extend(willPublishAReview)(
  'can publish a PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('main')).toContainText('We will ask you to log in')

    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your PREreview')).toHaveText(/^Write a short summary of/)
    } else {
      await expect(page.getByLabel('Write your PREreview')).toHaveValue(/^Write a short summary of/)
    }

    await page.getByLabel('Write your PREreview').clear()
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

    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Use of Artificial Intelligence (AI)')

    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Competing interests')

    await page.getByLabel('No').check()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('I’m following the Code of Conduct').check()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')
    if (javaScriptEnabled) {
      await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
        'Lorem ipsum dolor sit “amet”, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
        'Lorem ipsum dolor sit "amet", consectetur adipiscing elit.',
      )
    }
    await expect(page.getByRole('main')).toContainText(
      'Competing interests The author declares that they have no competing interests.',
    )

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await expect(page.getByRole('main')).toContainText('Share your review')
  },
)

test('can choose a locale before starting', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Escrever uma avaliação PREreview')
})

test.extend(canLogIn).extend(hasAVerifiedEmailAddress).extend(willPublishAReview)(
  'can publish a question-based PREreview',
  async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('main')).toContainText('We will ask you to log in')
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.getByLabel('With prompts').check()

    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Partly', { exact: true }).check()
    await page
      .getByLabel('How does the introduction only partly explain the objective?')
      .fill('Consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither appropriate nor inappropriate', { exact: true }).check()
    await page.getByLabel('Why are they neither appropriate nor inappropriate?').fill('Sed egestas tincidunt lacus.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither supported nor unsupported', { exact: true }).check()
    await page.getByLabel('Why are they neither supported nor unsupported?').fill('At blandit est facilisis et.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither appropriate and clear nor inappropriate and unclear', { exact: true }).check()
    await page
      .getByLabel('Why are they neither appropriate and clear nor inappropriate and unclear?')
      .fill('Lorem ipsum dolor sit amet.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither clearly nor unclearly', { exact: true }).check()
    await page.getByLabel('How is it neither clear nor unclear?').fill('Cras lobortis quam vitae.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Moderately likely', { exact: true }).check()
    await page.getByLabel('Why is it moderately likely?').fill('Aenean nisl eros.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByLabel('Why wouldn’t it?').fill('Condimentum in mi in.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but it needs to be improved').check()
    await page.getByLabel('What needs to be improved?').fill('Dignissim lobortis ligula.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, after minor changes').check()
    await page.getByLabel('What needs tweaking?').fill('Quisque in blandit arcu.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('region', { name: 'Your review' }).scrollIntoViewIfNeeded()

    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Does the introduction explain the objective of the research presented in the preprint? Partly Consectetur adipiscing elit.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Are the methods well-suited for this research? Neither appropriate nor inappropriate Sed egestas tincidunt lacus.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Are the conclusions supported by the data? Neither supported nor unsupported At blandit est facilisis et.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Are the data presentations, including visualizations, well-suited to represent the data? Neither appropriate and clear nor inappropriate and unclear Lorem ipsum dolor sit amet.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'How clearly do the authors discuss, explain, and interpret their findings and potential next steps for the research? Neither clearly nor unclearly Cras lobortis quam vitae.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Is the preprint likely to advance academic knowledge? Moderately likely Aenean nisl eros.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Would it benefit from language editing? No Condimentum in mi in.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Would you recommend this preprint to others? Yes, but it needs to be improved Dignissim lobortis ligula.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Is it ready for attention from an editor, publisher or broader audience? Yes, after minor changes Quisque in blandit arcu.',
    )
    await expect(page.getByRole('main')).toContainText(
      'Competing interests The author declares that they have no competing interests.',
    )

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
  },
)

test.extend(canLogIn)('can write a PREreview for a specific preprint', async ({ fetch, page }) => {
  fetch.get(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
  )
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Write a PREreview' }).click()

  await expect(page.getByRole('main')).toContainText('We will ask you to log in')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How would you like to start your PREreview?')
})

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress).extend(willPublishAReview)(
  'are taken to the start of the review process after successfully completing it',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but they don’t want to be listed as authors').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')

    await page.goBack()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Write a PREreview')
  },
)

test
  .extend(updatesLegacyPrereview)
  .extend(canLogIn)
  .extend(areLoggedIn)
  .extend(hasAVerifiedEmailAddress)
  .extend(willPublishAReview)('updates the legacy PREreview', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('With a template').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await waitForNotBusy(page)
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  fetch
    .getOnce('http://prereview.test/api/v2/resolve?identifier=10.1101/2022.01.13.476201', {
      body: {
        uuid: 'e7d28fbe-013a-4987-9faa-7f44a9f7683a',
      },
    })
    .postOnce(
      {
        url: 'http://prereview.test/api/v2/full-reviews',
        headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
      },
      { status: StatusCodes.Created },
    )

  await page.getByRole('button', { name: 'Publish PREreview' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
})

test
  .extend(updatesLegacyPrereview)
  .extend(canLogIn)
  .extend(areLoggedIn)
  .extend(hasAVerifiedEmailAddress)
  .extend(willPublishAReview)('might not update the legacy PREreview in time', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('With a template').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await waitForNotBusy(page)
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  fetch
    .getOnce(
      'http://prereview.test/api/v2/resolve?identifier=10.1101/2022.01.13.476201',
      { body: { uuid: 'e7d28fbe-013a-4987-9faa-7f44a9f7683a' } },
      { delay: Duration.toMillis('5 seconds') },
    )
    .postOnce(
      {
        url: 'http://prereview.test/api/v2/full-reviews',
        headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
      },
      { status: StatusCodes.Created },
      { delay: Duration.toMillis('5 seconds') },
    )

  await page.getByRole('button', { name: 'Publish PREreview' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'can paste an already-written PREreview',
  async ({ browserName, context, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('I’ve already written the review').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Paste your PREreview')

    const newPage = await context.newPage()
    await newPage.setContent(`<div contenteditable>
      <h1>Lorem ipsum</h1>
      <div>
        <p>Dolor sit amet, consectetur <strong>adipiscing</strong> <em>elit</em>.</p>
        <ul>
          <li>
            Sed id nibh in felis porta ultricies.
          </li>
          <li>
            <ol>
              <li>Praesent aliquet velit non nibh luctus imperdiet.</li>
            </ol>
          </li>
        </ul>
      </div>
    </div>`)
    await newPage.locator('[contenteditable]').selectText()
    await newPage.keyboard.press('Control+C')
    await newPage.close()

    await page.getByLabel('Paste your PREreview').focus()
    await page.keyboard.press('Control+V')

    if (javaScriptEnabled) {
      testInfo.fail(browserName === 'webkit')

      await expect(page.getByLabel('Paste your PREreview').getByRole('heading', { level: 1 })).toHaveText('Lorem ipsum')
      await expect(page.getByLabel('Paste your PREreview').getByRole('listitem')).toHaveText([
        'Sed id nibh in felis porta ultricies.',
        'Praesent aliquet velit non nibh luctus imperdiet.',
      ])
    } else {
      await expect(page.getByLabel('Paste your PREreview')).toHaveValue(/Lorem ipsum/)
    }
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can format a PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)

    if (!javaScriptEnabled) {
      await expect(page.getByRole('button', { name: 'Bold' })).toBeHidden()

      return
    }

    await page.getByLabel('Write your PREreview').clear()

    await page.getByRole('button', { name: 'Heading level 1' }).click()
    await expect(page.getByRole('button', { name: 'Heading level 1' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.type('Lorem')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('button', { name: 'Heading level 1' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.type('Ipsum')
    await page.getByRole('button', { name: 'Heading level 3' }).click()
    await page.getByRole('button', { name: 'Heading level 2' }).click()
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Heading level 3' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Heading level 2' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.press('Enter')

    await expect(page.getByRole('button', { name: 'Heading level 2' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.type('Dolor sit ')
    await page.keyboard.press('ArrowLeft')

    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-disabled', 'true')

    await page.keyboard.press('Shift+ArrowLeft')

    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-disabled', 'false')

    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft')

    page.once('dialog', dialog => {
      void dialog.accept('https://example.com').catch(Function.constVoid)
    })
    await page.getByRole('button', { name: 'Link' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Link' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('ArrowDown')
    await page.keyboard.type('"amet", ')

    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Link' })).toBeFocused()

    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: 'Numbered list' })).toBeFocused()

    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: 'Italic' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.type('consectetur')

    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Italic' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.type(' ')

    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.type('adipiscing ')

    await page.getByRole('button', { name: 'Subscript' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Subscript' })).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.type('el')

    await page.getByRole('button', { name: 'Superscript' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Subscript' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.type('it')

    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Superscript' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.type('.')

    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await page.getByRole('button', { name: 'Bulleted list' }).click()
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.type('Mauris')
    await page.keyboard.press('Enter')
    await page.keyboard.type('In ante')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.keyboard.type('turpis')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Numbered list' }).click()
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Numbered list' })).toHaveAttribute('aria-pressed', 'true')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress).extend(willPublishAReview)(
  'can publish a PREreview with more authors',
  async ({ emails, fetch, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, and some or all want to be listed as authors').check()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Add an author')

    await page.getByLabel('Name').fill('Jean-Baptiste Botul')
    await page.getByLabel('Email address').fill('jbbotul@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Use of Artificial Intelligence (AI)')

    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Competing interests')

    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Competing interests The authors declare that they have no competing interests.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )
    await expect(page.getByRole('main')).toContainText('Your published name Josiah Carberry')
    await expect(page.getByRole('main')).toContainText('Invited author Jean-Baptiste Botul')

    await page.getByRole('link', { name: 'Change invited authors' }).click()
    await page.getByRole('link', { name: 'Add another author' }).click()
    await page.getByLabel('Name').fill('Arne Saknussemm')
    await page.getByLabel('Email address').fill('asaknussemm@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('main')).toContainText('Invited authors Jean-Baptiste Botul and Arne Saknussemm')

    await page.getByRole('link', { name: 'Change invited authors' }).click()
    await page.getByRole('link', { name: 'Remove Jean-Baptiste Botul' }).click()
    await page.getByLabel('Yes, remove Jean-Baptiste Botul').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('main')).toContainText('Invited author Arne Saknussemm')

    await page.getByRole('link', { name: 'Change invited authors' }).click()
    await page.getByRole('link', { name: 'Change Arne Saknussemm’s details' }).click()
    await page.getByLabel('Name').fill('Axel Lidenbrock')
    await page.getByLabel('Email address').fill('alidenbrock@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('main')).toContainText('Invited author Axel Lidenbrock')

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await expect(page.getByRole('main')).toContainText('We’ve sent emails to the other authors')
    await expect(page.getByRole('main')).not.toContainText('other authors’ details')

    const record = {
      conceptdoi: Doi('10.5072/zenodo.1055805'),
      conceptrecid: 1055805,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id: 1055806,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [
          {
            name: 'Josiah Carberry',
            orcid: OrcidId('0000-0002-1825-0097'),
          },
        ],
        description: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
        doi: Doi('10.5072/zenodo.1055806'),
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
        title: 'PREreview of "The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii"',
      },
    } satisfies ZenodoRecord

    fetch
      .get('http://zenodo.test/api/records/1055806', {
        body: RecordC.encode(record),
      })
      .get('http://example.com/review.html/content', {
        body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      })

    await page.setContent(String(emails[0]?.html))

    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Be listed as an author' }).click()
    page = await opener

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Be listed as an author')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canAddMultipleAuthors)(
  'can enter multiple authors at the same time',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, and some or all want to be listed as authors').check()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page
      .getByLabel('Enter names and email address of the other authors')
      .fill('Jean-Baptiste Botul jbbotul@example.com\nArne Saknussemm asaknussemm@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You have added 2 other authors')
    await expect(page.getByRole('main')).toContainText('Name Jean-Baptiste Botul Email address jbbotul@example.com')
    await expect(page.getByRole('main')).toContainText('Name Arne Saknussemm Email address asaknussemm@example.com')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress).extend(willPublishAReview)(
  "can publish a PREreview with more authors who don't want to be listed as authors",
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but they don’t want to be listed as authors').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Competing interests The authors declare that they have no competing interests.',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await expect(page.getByRole('main')).not.toContainText('other authors’ details')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress).extend(willPublishAReview)(
  'can publish a PREreview with competing interests',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes').check()
    await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Competing interests Maecenas sed dapibus massa.')

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress).extend(willPublishAReview)(
  'can publish a PREreview using a pseudonym',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Published name Orange Panda')

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await expect(page.getByRole('main')).not.toContainText('Share your review')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can change the review after previewing',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

    await page.getByRole('link', { name: 'Change PREreview' }).click()
    await waitForNotBusy(page)

    await page
      .getByLabel('Write your PREreview')
      .fill('Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can change the name after previewing',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
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

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can change the use of AI after previewing',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Use of AI Not used')

    await page.getByRole('link', { name: 'Change use of AI' }).click()

    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Use of AI The author declares that they used generative AI to come up with new ideas for their review.',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can change the competing interests after previewing',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Competing interests The author declares that they have no competing interests.',
    )

    await page.getByRole('link', { name: 'Change competing interests' }).click()

    await page.getByLabel('Yes').check()
    await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Competing interests Maecenas sed dapibus massa.')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can change your answers when answering questions after previewing',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Partly', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither appropriate nor inappropriate', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither supported nor unsupported', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither appropriate and clear nor inappropriate and unclear', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither clearly nor unclearly', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Moderately likely', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but it needs to be improved').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, after minor changes').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const review = page.getByRole('region', { name: 'Your review' })

    await expect(review).toContainText(
      'Does the introduction explain the objective of the research presented in the preprint? Partly',
    )
    await expect(review).toContainText(
      'Are the methods well-suited for this research? Neither appropriate nor inappropriate',
    )
    await expect(review).toContainText('Are the conclusions supported by the data? Neither supported nor unsupported')
    await expect(review).toContainText(
      'Are the data presentations, including visualizations, well-suited to represent the data? Neither appropriate and clear nor inappropriate and unclear',
    )
    await expect(review).toContainText(
      'How clearly do the authors discuss, explain, and interpret their findings and potential next steps for the research? Neither clearly nor unclearly',
    )
    await expect(review).toContainText('Is the preprint likely to advance academic knowledge? Moderately likely')
    await expect(review).toContainText('Would it benefit from language editing? No')
    await expect(review).toContainText('Would you recommend this preprint to others? Yes, but it needs to be improved')
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Is it ready for attention from an editor, publisher or broader audience? Yes, after minor changes',
    )

    await page
      .getByRole('link', {
        name: 'Change if the introduction explains the objective of the research presented in the preprint',
      })
      .click()

    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Does the introduction explain the objective of the research presented in the preprint? I don’t know',
    )

    await page
      .getByRole('link', {
        name: 'Change if the introduction explains the objective of the research presented in the preprint',
      })
      .click()

    await page.getByLabel('No', { exact: true }).check()
    await page.getByLabel('How does the introduction not explain the objective?').fill('Consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Does the introduction explain the objective of the research presented in the preprint? No Consectetur adipiscing elit.',
    )

    await page
      .getByRole('link', {
        name: 'Change if the methods are well-suited for this research',
      })
      .click()

    await page.getByLabel('Somewhat appropriate', { exact: true }).check()
    await page.getByLabel('Why are they somewhat appropriate?').fill('Sed egestas tincidunt lacus.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'Are the methods well-suited for this research? Somewhat appropriate Sed egestas tincidunt lacus.',
    )

    await page.getByRole('link', { name: 'Change if the conclusions are supported by the data' }).click()

    await page.getByLabel('Somewhat supported', { exact: true }).check()
    await page.getByLabel('Why are they somewhat supported?').fill('At blandit est facilisis et.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'Are the conclusions supported by the data? Somewhat supported At blandit est facilisis et.',
    )

    await page
      .getByRole('link', { name: 'Change if the data presentations are well-suited to represent the data?' })
      .click()

    await page.getByLabel('Somewhat appropriate and clear', { exact: true }).check()
    await page.getByLabel('Why are they somewhat appropriate and clear?').fill('Lorem ipsum dolor sit amet.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'Are the data presentations, including visualizations, well-suited to represent the data? Somewhat appropriate and clear Lorem ipsum dolor sit amet.',
    )

    await page
      .getByRole('link', { name: 'Change how clearly the authors discuss their findings and next steps' })
      .click()

    await page.getByLabel('Somewhat clearly').check()
    await page.getByLabel('How is it somewhat clear?').fill('Cras lobortis quam vitae.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'How clearly do the authors discuss, explain, and interpret their findings and potential next steps for the research? Somewhat clearly Cras lobortis quam vitae.',
    )

    await page.getByRole('link', { name: 'Change if the preprint is likely to advance academic knowledge' }).click()

    await page.getByLabel('Somewhat likely', { exact: true }).check()
    await page.getByLabel('Why is it somewhat likely?').fill('Aenean nisl eros.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'Is the preprint likely to advance academic knowledge? Somewhat likely Aenean nisl eros.',
    )

    await page.getByRole('link', { name: 'Change if it would benefit from language editing' }).click()

    await page.getByLabel('Yes').check()
    await page.getByLabel('Why would it?').fill('Condimentum in mi in.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText('Would it benefit from language editing? Yes Condimentum in mi in.')

    await page.getByRole('link', { name: 'Change if you would recommend this preprint to others' }).click()

    await page.getByLabel('Yes, it’s of high quality').check()
    await page.getByLabel('How is it of high quality?').fill('Dignissim lobortis ligula.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'Would you recommend this preprint to others? Yes, it’s of high quality Dignissim lobortis ligula.',
    )

    await page
      .getByRole('link', { name: 'Change it it is ready for attention from an editor, publisher or broader audience' })
      .click()

    await page.getByLabel('Yes, as it is').check()
    await page.getByLabel('Why is it ready?').fill('Quisque in blandit arcu.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'Is it ready for attention from an editor, publisher or broader audience? Yes, as it is Quisque in blandit arcu.',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can go back through the form',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

    await page.goBack()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('No, I reviewed it alone')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

    await page.goBack()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your PREreview')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Write your PREreview')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }

    await page.goBack()

    await expect(page.getByLabel('With a template')).toBeChecked()

    await page.goBack()

    await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can go back through the form when answering questions', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('With prompts').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Partly', { exact: true }).check()
  await page
    .getByLabel('How does the introduction only partly explain the objective?')
    .fill('Consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Neither appropriate nor inappropriate', { exact: true }).check()
  await page.getByLabel('Why are they neither appropriate nor inappropriate?').fill('Sed egestas tincidunt lacus.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Neither supported nor unsupported', { exact: true }).check()
  await page.getByLabel('Why are they neither supported nor unsupported?').fill('At blandit est facilisis et.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Neither appropriate and clear nor inappropriate and unclear', { exact: true }).check()
  await page
    .getByLabel('Why are they neither appropriate and clear nor inappropriate and unclear?')
    .fill('Lorem ipsum dolor sit amet.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Neither clearly nor unclearly', { exact: true }).check()
  await page.getByLabel('How is it neither clear nor unclear?').fill('Cras lobortis quam vitae.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Moderately likely', { exact: true }).check()
  await page.getByLabel('Why is it moderately likely?').fill('Aenean nisl eros.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByLabel('Why wouldn’t it?').fill('Condimentum in mi in.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes, but it needs to be improved').click()
  await page.getByLabel('What needs to be improved?').fill('Dignissim lobortis ligula.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Yes, after minor changes').click()
  await page.getByLabel('What needs tweaking?').fill('Quisque in blandit arcu.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.waitForLoadState()

  await page.goBack()

  await expect(page.getByLabel('Yes, after minor changes')).toBeChecked()
  await expect(page.getByLabel('What needs tweaking?')).toHaveText('Quisque in blandit arcu.')

  await page.goBack()

  await expect(page.getByLabel('Yes, but it needs to be improved')).toBeChecked()
  await expect(page.getByLabel('What needs to be improved?')).toHaveText('Dignissim lobortis ligula.')

  await page.goBack()

  await expect(page.getByLabel('No')).toBeChecked()
  await expect(page.getByLabel('Why wouldn’t it?')).toHaveText('Condimentum in mi in.')

  await page.goBack()

  await expect(page.getByLabel('Moderately likely', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Why is it moderately likely?')).toHaveText('Aenean nisl eros.')

  await page.goBack()

  await expect(page.getByLabel('Neither clearly nor unclearly', { exact: true })).toBeChecked()
  await expect(page.getByLabel('How is it neither clear nor unclear?')).toHaveText('Cras lobortis quam vitae.')

  await page.goBack()

  await expect(
    page.getByLabel('Neither appropriate and clear nor inappropriate and unclear', { exact: true }),
  ).toBeChecked()
  await expect(page.getByLabel('Why are they neither appropriate and clear nor inappropriate and unclear?')).toHaveText(
    'Lorem ipsum dolor sit amet.',
  )

  await page.goBack()

  await expect(page.getByLabel('Neither supported nor unsupported', { exact: true })).toBeChecked()
  await page.getByLabel('Why are they neither supported nor unsupported?').fill('At blandit est facilisis et.')

  await page.goBack()

  await expect(page.getByLabel('Neither appropriate nor inappropriate', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Why are they neither appropriate nor inappropriate?')).toHaveText(
    'Sed egestas tincidunt lacus.',
  )

  await page.goBack()

  await expect(page.getByLabel('Partly', { exact: true })).toBeChecked()
  await expect(page.getByLabel('How does the introduction only partly explain the objective?')).toHaveText(
    'Consectetur adipiscing elit.',
  )

  await page.goBack()

  await expect(page.getByLabel('With prompts')).toBeChecked()
})

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'see existing values when going back a step',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('I’ve already written the review').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('I’ve already written the review')).toBeChecked()

    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No, I reviewed it alone')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your PREreview')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Write your PREreview')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('With a template')).toBeChecked()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'see existing values when adding authors and going back a step',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, and some or all want to be listed as authors').click()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Yes, and some or all want to be listed as authors')).toBeChecked()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Name').fill('Jean-Baptiste Botul')
    await page.getByLabel('Email address').fill('jbbotul@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You have added 1 other author')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Yes, and some or all want to be listed as authors')).toBeChecked()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You have added 1 other author')

    await page.getByRole('link', { name: 'Change Jean-Baptiste Botul’s details' }).click()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You have added 1 other author')

    await page.getByRole('link', { name: 'Remove Jean-Baptiste Botul' }).click()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You have added 1 other author')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'see existing values when answering questions and going back a step',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Partly', { exact: true }).check()
    await page
      .getByLabel('How does the introduction only partly explain the objective?')
      .fill('Consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither appropriate nor inappropriate', { exact: true }).check()
    await page.getByLabel('Why are they neither appropriate nor inappropriate?').fill('Sed egestas tincidunt lacus.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither supported nor unsupported', { exact: true }).check()
    await page.getByLabel('Why are they neither supported nor unsupported?').fill('At blandit est facilisis et.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither appropriate and clear nor inappropriate and unclear', { exact: true }).check()
    await page
      .getByLabel('Why are they neither appropriate and clear nor inappropriate and unclear?')
      .fill('Lorem ipsum dolor sit amet.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither clearly nor unclearly', { exact: true }).check()
    await page.getByLabel('How is it neither clear nor unclear?').fill('Cras lobortis quam vitae.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Moderately likely', { exact: true }).check()
    await page.getByLabel('Why is it moderately likely?').fill('Aenean nisl eros.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByLabel('Why wouldn’t it?').fill('Condimentum in mi in.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but it needs to be improved').check()
    await page.getByLabel('What needs to be improved?').fill('Dignissim lobortis ligula.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, after minor changes').check()
    await page.getByLabel('What needs tweaking?').fill('Quisque in blandit arcu.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Yes, after minor changes')).toBeChecked()
    await expect(page.getByLabel('What needs tweaking?')).toHaveText('Quisque in blandit arcu.')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Yes, but it needs to be improved')).toBeChecked()
    await expect(page.getByLabel('What needs to be improved?')).toHaveText('Dignissim lobortis ligula.')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No')).toBeChecked()
    await expect(page.getByLabel('Why wouldn’t it?')).toHaveText('Condimentum in mi in.')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Moderately likely', { exact: true })).toBeChecked()
    await expect(page.getByLabel('Why is it moderately likely?')).toHaveText('Aenean nisl eros.')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Neither clearly nor unclearly', { exact: true })).toBeChecked()
    await expect(page.getByLabel('How is it neither clear nor unclear?')).toHaveText('Cras lobortis quam vitae.')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(
      page.getByLabel('Neither appropriate and clear nor inappropriate and unclear', { exact: true }),
    ).toBeChecked()
    await expect(
      page.getByLabel('Why are they neither appropriate and clear nor inappropriate and unclear?'),
    ).toHaveText('Lorem ipsum dolor sit amet.')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Neither supported nor unsupported', { exact: true })).toBeChecked()
    await expect(page.getByLabel('Why are they neither supported nor unsupported?')).toHaveText(
      'At blandit est facilisis et.',
    )

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Neither appropriate nor inappropriate', { exact: true })).toBeChecked()
    await expect(page.getByLabel('Why are they neither appropriate nor inappropriate?')).toHaveText(
      'Sed egestas tincidunt lacus.',
    )

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Partly', { exact: true })).toBeChecked()
    await expect(page.getByLabel('How does the introduction only partly explain the objective?')).toHaveText(
      'Consectetur adipiscing elit.',
    )

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('With prompts')).toBeChecked()
  },
)

test.extend(canLogIn).extend(areLoggedIn)("aren't told about ORCID when already logged in", async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })

  await expect(page.getByRole('main')).not.toContainText('ORCID')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How would you like to start your PREreview?')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a PREreview',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.goto('/', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your PREreview')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step after logging in if you have already started a PREreview',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.goto('/log-out', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your PREreview')
  },
)

test('when the preprint is not found', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/this-should-not-find-anything')

  fetch.get('https://api.crossref.org/works/10.1101%2Fthis-should-not-find-anything', { status: StatusCodes.NotFound })

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t know this preprint')
})

test('when it is not a preprint', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/not-a-preprint')

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

test('might not load the preprint in time', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/this-should-take-too-long')

  fetch.get(
    'https://api.crossref.org/works/10.1101%2Fthis-should-take-too-long',
    { status: StatusCodes.NotFound },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test('when is DOI is not supported', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page.getByLabel('Which preprint are you reviewing?').fill('10.5555/12345678')

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this DOI')
})

test('when is URL is not supported', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page
    .getByLabel('Which preprint are you reviewing?')
    .fill('https://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')

  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this URL')
})

test.extend(canLogIn)('have to grant access to your ORCID iD', async ({ oauthServer, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  oauthServer.service.once('beforeAuthorizeRedirect', ({ url }: MutableRedirectUri) => {
    url.searchParams.delete('code')
    url.searchParams.set('error', 'access_denied')
  })
  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we can’t log you in')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to give your email address',
  async ({ emails, javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact details')

    await page.getByLabel('What is your email address?').fill('jcarberry@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email address')

    await page.setContent(String(emails[0]?.html))

    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Verify email address' }).click()
    page = await opener

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAnUnverifiedEmailAddress)(
  'have to verify your email address',
  async ({ emails, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByLabel('What is your email address?')).toHaveValue('jcarberry@example.com')

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email address')

    await page.setContent(String(emails[0]?.html))

    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Verify email address' }).click()
    page = await opener

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can resend the verification email',
  async ({ emails, javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('What is your email address?').fill('jcarberry@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email address')

    await page.getByRole('button', { name: 'Resend email' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Important' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Important' })).toBeInViewport()
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email address')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Important' })).toBeHidden()

    await page.setContent(String(emails[1]?.html))

    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Verify email address' }).click()
    page = await opener

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')
  },
)

test('are told if ORCID is unavailable', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  fetch.postOnce('http://orcid.test/token', { status: StatusCodes.ServiceUnavailable })
  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test('might not authenticate with ORCID in time', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  fetch.postOnce(
    'http://orcid.test/token',
    {
      status: StatusCodes.OK,
      body: {
        access_token: 'access-token',
        token_type: 'Bearer',
        name: 'Josiah Carberry',
        orcid: '0000-0002-1825-0097',
      },
    },
    { delay: Duration.toMillis('2.5 seconds') },
  )
  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'are told if Zenodo is unavailable',
  async ({ fetch, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    fetch.postOnce('http://zenodo.test/api/deposit/depositions', { status: StatusCodes.ServiceUnavailable })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
  },
)

test.extend(canLogIn)('mind not find the pseudonym in time', async ({ fetch, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  fetch.get(
    {
      url: 'http://prereview.test/api/v2/users/0000-0002-1825-0097',
      headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
    },
    { status: StatusCodes.NotFound },
    { delay: Duration.toMillis('2.5 seconds'), overwriteRoutes: true },
  )
  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say what type of review you want to do',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'How would you like to start your PREreview?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select how you would like to start your PREreview' }).click()

    await expect(page.getByLabel('With prompts')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to enter a review', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('With a template').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await waitForNotBusy(page)
  await page.getByLabel('Write your PREreview').clear()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('Write your PREreview')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter your PREreview' }).click()

  await expect(page.getByLabel('Write your PREreview')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)(
  "can't use the template as the review",
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Write your PREreview')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Enter your PREreview' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to paste a review', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('I’ve already written the review').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('Paste your PREreview')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Paste your PREreview' }).click()

  await expect(page.getByLabel('Paste your PREreview')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the introduction explains the objective',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Does the introduction explain the objective of the research presented in the preprint?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', {
        name: 'Select if the introduction explains the objective of the research presented in the preprint',
      })
      .click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the methods are appropriate',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Are the methods well-suited for this research?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', {
        name: 'Select if the methods are well-suited for this research',
      })
      .click()

    await expect(page.getByLabel('Highly appropriate', { exact: true })).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the results presented are supported by the data',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Are the conclusions supported by the data?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page
      .getByRole('link', {
        name: 'Select if the conclusions are supported by the data',
      })
      .click()

    await expect(page.getByLabel('Highly supported', { exact: true })).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the data presentations are appropriate and clear',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Are the data presentations, including visualizations, well-suited to represent the data?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', {
        name: 'Select if the data presentations are well-suited to represent the data',
      })
      .click()

    await expect(page.getByLabel('Highly appropriate and clear', { exact: true })).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say how well the authors discuss their findings and next steps',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'How clearly do the authors discuss, explain, and interpret their findings and potential next steps for the research?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', {
        name: 'Select how clearly the authors discuss their findings and next steps',
      })
      .click()

    await expect(page.getByLabel('Very clearly')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the findings are novel',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Is the preprint likely to advance academic knowledge?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', {
        name: 'Select if the preprint is likely to advance academic knowledge',
      })
      .click()

    await expect(page.getByLabel('Highly likely', { exact: true })).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if would benefit from language editing',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Would it benefit from language editing?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select yes if it would benefit from language editing' }).click()

    await expect(page.getByLabel('No')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if others should read this preprint',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Would you recommend this preprint to others?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select yes if you would recommend this preprint to others' }).click()

    await expect(page.getByLabel('Yes, it’s of high quality')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if it is ready for a full and detailed review',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With prompts').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but it needs to be improved').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Is it ready for attention from an editor, publisher or broader audience?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', {
        name: 'Select yes if it is ready for attention from an editor, publisher or broader audience',
      })
      .click()

    await expect(page.getByLabel('Yes, as it is')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to choose a name', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('With a template').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await waitForNotBusy(page)
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
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
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if there are more authors',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Did you review this preprint with anyone else?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select yes if you reviewed the preprint with someone else' }).click()

    await expect(page.getByLabel('No, I reviewed it alone')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say that the other authors have read and approved the PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes, and some or all want to be listed as authors').click()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('They have read and approved the PREreview')).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', { name: 'Confirm that the other authors have read and approved the PREreview' })
      .click()

    await expect(page.getByLabel('They have read and approved the PREreview')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  "have to give the other author's details",
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes, and some or all want to be listed as authors').click()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Enter their name' }).click()

    await expect(page.getByLabel('Name')).toBeFocused()

    await page.getByRole('link', { name: 'Enter their email address' }).click()

    await expect(page.getByLabel('Email address')).toBeFocused()

    await page.getByLabel('Name').fill('a name')
    await page.getByLabel('Email address').fill('not an email address')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Name')).not.toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', { name: 'Enter an email address in the correct format, like name@example.com' })
      .click()

    await expect(page.getByLabel('Email address')).toBeFocused()

    await page.getByLabel('Email address').fill('email@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('link', { name: 'Change a name’s details' }).click()

    await page.getByLabel('Name').clear()
    await page.getByLabel('Email address').clear()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Enter their name' }).click()

    await expect(page.getByLabel('Name')).toBeFocused()

    await page.getByRole('link', { name: 'Enter their email address' }).click()

    await expect(page.getByLabel('Email address')).toBeFocused()

    await page.getByLabel('Name').fill('a name')
    await page.getByLabel('Email address').fill('not an email address')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Name')).not.toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', { name: 'Enter an email address in the correct format, like name@example.com' })
      .click()

    await expect(page.getByLabel('Email address')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canAddMultipleAuthors)(
  "have to give the other author's details when entering multiple",
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes, and some or all want to be listed as authors').click()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Enter names and email address of the other authors')).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Enter the author names and email addresses' }).click()

    await expect(page.getByLabel('Enter names and email address of the other authors')).toBeFocused()

    await page.getByLabel('Enter names and email address of the other authors').fill('not names and email addresses')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Enter names and email address of the other authors')).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Enter the author names and email addresses in the correct format' }).click()

    await expect(page.getByLabel('Enter names and email address of the other authors')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if you want to remove an author',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes, and some or all want to be listed as authors').click()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Name').fill('Jean-Baptiste Botul')
    await page.getByLabel('Email address').fill('jbbotul@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('link', { name: 'Remove Jean-Baptiste Botul' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Are you sure you want to remove Jean-Baptiste Botul?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select yes if you want to remove Jean-Baptiste Botul' }).click()

    await expect(page.getByLabel('No')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to declare the use of AI', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('With a template').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await waitForNotBusy(page)
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByRole('group', { name: 'Did you use AI to generate ideas for this review?' })).toHaveAttribute(
    'aria-invalid',
    'true',
  )

  await page.getByRole('link', { name: 'Select yes if you used AI to generate ideas for this review' }).click()

  await expect(page.getByLabel('No')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to declare the use of AI by any author',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, and some or all want to be listed as authors').check()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Name').fill('Jean-Baptiste Botul')
    await page.getByLabel('Email address').fill('jbbotul@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Did you, or any of the other authors, use AI to generate ideas for this review?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', {
        name: 'Select yes if you, or any of the other authors, used AI to generate ideas for this review',
      })
      .click()

    await expect(page.getByLabel('No')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to declare any competing interests',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
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

test.extend(canLogIn).extend(areLoggedIn)(
  'have to declare any competing interests by any author',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, and some or all want to be listed as authors').check()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Name').fill('Jean-Baptiste Botul')
    await page.getByLabel('Email address').fill('jbbotul@example.com')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Do you, or any of the other authors, have any competing interests?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', { name: 'Select yes if you, or any of the other authors, have any competing interests' })
      .click()

    await expect(page.getByLabel('No')).toBeFocused()

    await page.getByLabel('Yes').check()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('What are they?')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Enter details of the competing interests' }).click()

    await expect(page.getByLabel('What are they?')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to agree to the Code of Conduct',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
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

test.extend(canLogIn).extend(areLoggedIn)('have to enter an email address', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('With a template').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await waitForNotBusy(page)
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter your email address' }).click()

  await expect(page.getByLabel('What is your email address?')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to enter a valid email address',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('With a template').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await waitForNotBusy(page)
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('What is your email address?').fill('not an email address')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', { name: 'Enter an email address in the correct format, like name@example.com' })
      .click()

    await expect(page.getByLabel('What is your email address?')).toBeFocused()
  },
)

test.extend(canLogIn)("can't review my own preprint", async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-12345678', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'Write a PREreview' }).click()
  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, you can’t review your own preprint')
})

test.extend(canLogIn).extend(areLoggedIn)(
  "can't review my own preprint when I'm already logged in",
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-12345678', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Write a PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, you can’t review your own preprint')

    await page.goto('/preprints/doi-10.1101-12345678/write-a-prereview/review-type', { waitUntil: 'commit' })

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, you can’t review your own preprint')
  },
)
