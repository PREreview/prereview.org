import { Status } from 'hyper-ts'
import { URL } from 'url'
import { RecordsC } from 'zenodo-ts'
import { areLoggedIn, canLogIn, canRapidReview, expect, test, updatesLegacyPrereview, willPublishAReview } from './base'

test.extend(canLogIn).extend(willPublishAReview)(
  'can publish a PREreview',
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('main')).toContainText('We will ask you to log in')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Start now' }).click()

    await page.locator('[type=email]').fill('test@example.com')
    await page.locator('[type=password]').fill('password')
    await page.keyboard.press('Enter')

    await page.getByLabel('No').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your PREreview')).toHaveText(/^Write a short summary of/)
    } else {
      await expect(page.getByLabel('Write your PREreview')).toHaveValue(/^Write a short summary of/)
    }

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Write your PREreview').clear()
    await page.keyboard.type('# Some title')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Lorem ipsum dolor sit "amet", *consectetur* ')
    await (javaScriptEnabled ? page.keyboard.press('Control+b') : page.keyboard.type('<b>'))
    await page.keyboard.type('adipiscing elit')
    await (javaScriptEnabled ? page.keyboard.press('Control+b') : page.keyboard.type('</b>'))
    await page.keyboard.type('.')

    await page.evaluate(() => document.querySelector('html')?.setAttribute('spellcheck', 'false'))

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Josiah Carberry').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('No, I reviewed it alone').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('No').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('I’m following the Code of Conduct').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

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
    await expect(page.getByRole('main')).toContainText('Competing interests None')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(willPublishAReview)(
  'can publish a question-based PREreview',
  async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('main')).toContainText('We will ask you to log in')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.locator('[type=email]').fill('test@example.com')
    await page.locator('[type=password]').fill('password')
    await page.keyboard.press('Enter')

    await page.getByLabel('Guided review').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Partly').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequate').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither supported nor not supported').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither adequate nor inadequate').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequately', { exact: true }).check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('region', { name: 'Your review' }).scrollIntoViewIfNeeded()

    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Does the introduction explain the objective and match the rest of the preprint? Partly',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Are the methods appropriate? Adequate',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Are the results presented supported by the data? Neither supported nor not supported',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Are the data presentations, including visualizations, appropriate and clear? Neither adequate nor inadequate',
    )
    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'How well do the authors discuss, explain, and interpret their findings and potential next steps for the research? Adequately',
    )
    await expect(page.getByRole('main')).toContainText('Competing interests None')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
  },
)

test.extend(canLogIn)('can write a PREreview for a specific preprint', async ({ fetch, page }) => {
  fetch.get(
    {
      url: 'http://zenodo.test/api/records/',
      query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
  )
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.getByRole('link', { name: 'Write a PREreview' }).click()

  await expect(page.getByRole('main')).toContainText('We will ask you to log in')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Start now' }).click()

  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Have you already written your PREreview?')
})

test.extend(canLogIn).extend(areLoggedIn).extend(willPublishAReview)(
  'are taken to the start of the review process after successfully completing it',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but they don’t want to be listed as authors').check()
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

test.extend(canLogIn).extend(areLoggedIn).extend(willPublishAReview)(
  'can skip to the forms',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Publish PREreview' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'can skip to the forms when answering questions',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Guided review').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Partly').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Adequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Neither supported nor not supported').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Neither adequate nor inadequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()
    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await page.waitForLoadState()

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Adequately', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
  },
)

test.extend(updatesLegacyPrereview).extend(canLogIn).extend(areLoggedIn).extend(willPublishAReview)(
  'updates the legacy PREreview',
  async ({ fetch, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
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
        { status: Status.Created },
      )

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can paste an already-written PREreview',
  async ({ browserName, context, contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Paste your PREreview')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

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
      testInfo.fail(browserName === 'firefox', 'https://github.com/microsoft/playwright/issues/18339')

      await expect(page.getByLabel('Paste your PREreview').getByRole('heading', { level: 1 })).toHaveText('Lorem ipsum')
      await expect(page.getByLabel('Paste your PREreview').getByRole('listitem')).toHaveText([
        'Sed id nibh in felis porta ultricies.',
        'Praesent aliquet velit non nibh luctus imperdiet.',
      ])
    } else {
      await expect(page.getByLabel('Paste your PREreview')).toHaveValue(/Lorem ipsum/)
    }

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'can format a PREreview',
  async ({ browserName, contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()

    await page.evaluate(() => document.querySelector('html')?.setAttribute('spellcheck', 'false'))

    if (!javaScriptEnabled) {
      await expect(page.getByRole('button', { name: 'Bold' })).toBeHidden()

      return
    }
    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await page.getByLabel('Write your PREreview').clear()

    await page.getByRole('button', { name: 'Heading level 1' }).click()
    await expect(page.getByRole('button', { name: 'Heading level 1' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    if (browserName === 'webkit') {
      await page.getByLabel('Write your PREreview').scrollIntoViewIfNeeded()
    }

    await page.keyboard.type('Lorem')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
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
      void dialog.accept('https://example.com')
    })
    await page.getByRole('button', { name: 'Link' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

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
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

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
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false')

    await page.keyboard.type('.')

    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Superscript' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveScreenshot()

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
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Numbered list' }).click()
    await expect(page.getByLabel('Write your PREreview')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'Numbered list' })).toHaveAttribute('aria-pressed', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(willPublishAReview)(
  'can publish a PREreview with more authors',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, and some or all want to be listed as authors').check()
    await page.getByLabel('They have read and approved the PREreview').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Add more authors')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await expect(page.getByRole('main')).toContainText('other authors’ details')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(willPublishAReview)(
  "can publish a PREreview with more authors who don't want to be listed as authors",
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Yes, but they don’t want to be listed as authors').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
    await expect(page.getByRole('main')).not.toContainText('other authors’ details')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(willPublishAReview)(
  'can publish a PREreview with competing interests',
  async ({ contextOptions, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('Yes').check()
    await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Competing interests Maecenas sed dapibus massa.')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(willPublishAReview)(
  'can publish a PREreview using a pseudonym',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Published name Orange Panda')

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
    await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can change the review after previewing', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForLoadState()
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  )

  await page.getByRole('link', { name: 'Change PREreview' }).click()
  await page.waitForLoadState()

  await page
    .getByLabel('Write your PREreview')
    .fill('Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('region', { name: 'Your review' })).toContainText(
    'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
  )
})

test.extend(canLogIn).extend(areLoggedIn)('can change the name after previewing', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForLoadState()
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
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
})

test.extend(canLogIn).extend(areLoggedIn)('can change the competing interests after previewing', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForLoadState()
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Competing interests None')

  await page.getByRole('link', { name: 'Change competing interests' }).click()

  await page.getByLabel('Yes').check()
  await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Competing interests Maecenas sed dapibus massa.')
})

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'can change your answers when answering questions after previewing',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Partly').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither supported nor not supported').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither adequate nor inadequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequately', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const review = page.getByRole('region', { name: 'Your review' })

    await expect(review).toContainText(
      'Does the introduction explain the objective and match the rest of the preprint? Partly',
    )
    await expect(review).toContainText('Are the methods appropriate? Adequate')
    await expect(review).toContainText(
      'Are the results presented supported by the data? Neither supported nor not supported',
    )
    await expect(review).toContainText(
      'Are the data presentations, including visualizations, appropriate and clear? Neither adequate nor inadequate',
    )
    await expect(review).toContainText(
      'How well do the authors discuss, explain, and interpret their findings and potential next steps for the research? Adequately',
    )

    await page
      .getByRole('link', {
        name: 'Change if the introduction explains the objective and matches the rest of the preprint',
      })
      .click()

    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Does the introduction explain the objective and match the rest of the preprint? I don’t know',
    )

    await page
      .getByRole('link', {
        name: 'Change if the introduction explains the objective and matches the rest of the preprint',
      })
      .click()

    await page.getByLabel('I don’t know').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Does the introduction explain the objective and match the rest of the preprint? I don’t know',
    )

    await page
      .getByRole('link', {
        name: 'Change if the methods are appropriate',
      })
      .click()

    await page.getByLabel('Mostly appropriate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText('Are the methods appropriate? Mostly appropriate')

    await page.getByRole('link', { name: 'Change if the results presented are supported by the data' }).click()

    await page.getByLabel('Well supported').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText('Are the results presented supported by the data? Well supported')

    await page.getByRole('link', { name: 'Change if the data presentations are appropriate and clear' }).click()

    await page.getByLabel('Mostly appropriate and clear').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'Are the data presentations, including visualizations, appropriate and clear? Mostly appropriate and clear',
    )

    await page.getByRole('link', { name: 'Change how well the authors discuss their findings and next steps' }).click()

    await page.getByLabel('Clearly and insightfully').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(review).toContainText(
      'How well do the authors discuss, explain, and interpret their findings and potential next steps for the research? Clearly and insightfully',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can go back through the form', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForLoadState()
  await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No, I reviewed it alone').check()
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

  await expect(page.getByLabel('No')).toBeChecked()

  await page.goBack()

  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
})

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'can go back through the form when answering questions',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Partly').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither supported nor not supported').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither adequate nor inadequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequately', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()

    await page.goBack()

    await expect(page.getByLabel('Adequately', { exact: true })).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Neither adequate nor inadequate')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Neither supported nor not supported')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Adequate')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Partly')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Guided review')).toBeChecked()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'see existing values when going back a step',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
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

    await expect(page.getByLabel('No')).toBeChecked()

    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Paste your PREreview')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Paste your PREreview')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'see existing values when answering questions and going back a step',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Partly').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither supported nor not supported').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Neither adequate nor inadequate').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Adequately', { exact: true }).check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Adequately', { exact: true })).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Neither adequate nor inadequate')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Neither supported nor not supported')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Adequate')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Partly')).toBeChecked()

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Guided review')).toBeChecked()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  "aren't told about ORCID when already logged in",
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')

    await expect(page.getByRole('main')).not.toContainText('ORCID')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
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

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Have you already written your PREreview?')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.goto('/')
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
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

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your PREreview')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step after logging in if you have already started a PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.goto('/log-out')
    await page.getByRole('link', { name: 'Review a preprint' }).click()
    await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/2022.01.13.476201')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.locator('[type=email]').fill('test@example.com')
    await page.locator('[type=password]').fill('password')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a PREreview')
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

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your PREreview')
  },
)

test('when the preprint is not found', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/this-should-not-find-anything')

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

test('when it is not a preprint', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/')
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

test('might not load the preprint in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page.getByLabel('Which preprint are you reviewing?').fill('10.1101/this-should-take-too-long')

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

test('when is DOI is not supported', async ({ javaScriptEnabled, page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page.getByLabel('Which preprint are you reviewing?').fill('10.5555/12345678')

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
  await page.goto('/')
  await page.getByRole('link', { name: 'Review a preprint' }).click()
  await page
    .getByLabel('Which preprint are you reviewing?')
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

test.extend(canLogIn)('have to grant access to your ORCID iD', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  const [redirectUri, state] = await Promise.all([
    page.locator('[name=redirectUri]').inputValue(),
    page.locator('[name=state]').inputValue(),
  ])
  await page.goto(`${new URL(redirectUri).pathname}?error=access_denied&state=${state}`)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we can’t log you in')
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

test('are told if ORCID is unavailable', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')

  fetch.postOnce('http://orcid.test/token', { status: Status.ServiceUnavailable })
  await page.keyboard.press('Enter')

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

test('might not authenticate with ORCID in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')

  fetch.postOnce(
    'http://orcid.test/token',
    new Promise(() =>
      setTimeout(
        () => ({
          status: Status.OK,
          body: {
            access_token: 'access-token',
            token_type: 'Bearer',
            name: 'Josiah Carberry',
            orcid: '0000-0002-1825-0097',
          },
        }),
        2000,
      ),
    ),
  )
  await page.keyboard.press('Enter')

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

test.extend(canLogIn).extend(areLoggedIn)(
  'are told if Zenodo is unavailable',
  async ({ fetch, javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').fill('Lorem ipsum')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No, I reviewed it alone').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    fetch.postOnce('http://zenodo.test/api/deposit/depositions', { status: Status.ServiceUnavailable })

    await page.getByRole('button', { name: 'Publish PREreview' }).click()

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
  },
)

test.extend(canLogIn)('mind not find the pseudonym in time', async ({ fetch, javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')

  fetch.get(
    {
      url: 'http://prereview.test/api/v2/users/0000-0002-1825-0097',
      headers: { 'X-Api-App': 'app', 'X-Api-Key': 'key' },
    },
    new Promise(() =>
      setTimeout(
        () => ({
          status: Status.NotFound,
        }),
        2000,
      ),
    ),
    { overwriteRoutes: true },
  )
  await page.keyboard.press('Enter')

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

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if you have already written your PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Have you already written your PREreview?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select yes if you have already written your PREreview' }).click()

    await expect(page.getByLabel('No')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'have to say what type of review you want to do',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.getByRole('button', { name: 'Continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'How would you like to write your PREreview?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select how you would like to write your PREreview' }).click()

    await expect(page.getByLabel('Guided review')).toBeFocused()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to enter a review',
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByLabel('Write your PREreview').clear()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Write your PREreview')).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter your PREreview' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  "can't use the template as the review",
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Write your PREreview')).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter your PREreview' }).click()

    await expect(page.getByLabel('Write your PREreview')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to paste a review',
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Paste your PREreview')).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Paste your PREreview' }).click()

    await expect(page.getByLabel('Paste your PREreview')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'have to say if the introduction matches the rest of the preprint',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Does the introduction explain the objective and match the rest of the preprint?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page
      .getByRole('link', {
        name: 'Select if the introduction explains the objective and matches the rest of the preprint',
      })
      .click()

    await expect(page.getByLabel('Yes')).toBeFocused()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'have to say if the methods are appropriate',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
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
        name: 'Are the methods appropriate?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page
      .getByRole('link', {
        name: 'Select if the methods are appropriate',
      })
      .click()

    await expect(page.getByLabel('Inappropriate', { exact: true })).toBeFocused()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'have to say if the results presented are supported by the data',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
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
    await expect(page.getByRole('group', { name: 'Are the results presented supported by the data' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page
      .getByRole('link', {
        name: 'Select if the results presented are supported by the data',
      })
      .click()

    await expect(page.getByLabel('Not supported', { exact: true })).toBeFocused()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'have to say if the data presentations are appropriate and clear',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
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
      page.getByRole('group', { name: 'Are the data presentations, including visualizations, appropriate and clear?' }),
    ).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page
      .getByRole('link', {
        name: 'Select if the data presentations are appropriate and clear',
      })
      .click()

    await expect(page.getByLabel('Inappropriate and unclear')).toBeFocused()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canRapidReview).extend(canLogIn).extend(areLoggedIn)(
  'have to say how well the authors discuss their findings and next steps',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Guided review').check()
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
        name: 'How well do the authors discuss, explain, and interpret their findings and potential next steps for the research?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page
      .getByRole('link', {
        name: 'Select how well the authors discuss their findings and next steps',
      })
      .click()

    await expect(page.getByLabel('Inadequately')).toBeFocused()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to choose a name', async ({ javaScriptEnabled, page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForLoadState()
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
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('link', { name: 'Select the name that you would like to use' }).click()

  await expect(page.getByLabel('Josiah Carberry')).toBeFocused()
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if there are more authors',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
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
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select yes if you reviewed the preprint with someone else' }).click()

    await expect(page.getByLabel('No, I reviewed it alone')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say that the other authors have read and approved the PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
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
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page
      .getByRole('link', { name: 'Confirm that the other authors have read and approved the PREreview' })
      .click()

    await expect(page.getByLabel('They have read and approved the PREreview')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to declare any competing interests',
  async ({ contextOptions, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
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
    await expect(page.getByRole('group', { name: 'Do you have any competing interests?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select yes if you have any competing interests' }).click()

    await expect(page.getByLabel('No')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByLabel('Yes').check()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('What are they?')).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter details of your competing interests' }).click()

    await expect(page.getByLabel('What are they?')).toBeFocused()

    testInfo.skip(contextOptions.forcedColors === 'active', 'https://github.com/microsoft/playwright/issues/15211')

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to agree to the Code of Conduct',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForLoadState()
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
    await expect(page.getByRole('group', { name: 'Code of Conduct' })).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Confirm that you are following the Code of Conduct' }).click()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)
