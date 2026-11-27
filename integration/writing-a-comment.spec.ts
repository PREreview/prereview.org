import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Events from '../src/Domain/Events/index.ts'
import { BiorxivPreprintId } from '../src/Domain/Preprints/index.ts'
import { html } from '../src/html.ts'
import { Doi } from '../src/types/Doi.ts'
import { Name } from '../src/types/Name.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import {
  areLoggedIn,
  test as baseTest,
  canLogIn,
  expect,
  hasAnUnverifiedEmailAddress,
  hasAVerifiedEmailAddress,
  usePostgresDB,
  waitForEditor,
  waitForProseMirrorFocus,
  willPublishAComment,
} from './base.ts'

const test = baseTest.extend(usePostgresDB).extend({
  seedEvents: async ({ seedEvents }, use) => {
    await use([
      ...seedEvents,
      new Events.PreprintReviewImported({
        authors: [
          {
            _tag: 'PublicPersona',
            name: Option.some(Name('Josiah Carberry')),
            orcidId: OrcidId('0000-0002-1825-0097'),
          },
        ],
        otherAuthors: 0,
        doi: Doi('10.5072/zenodo.1061864'),
        id: 1061864,
        license: 'CC-BY-4.0',
        published: Temporal.PlainDate.from('2022-07-05'),
        preprint: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
        live: false,
        useOfAi: { _tag: 'NotAnswered' },
        competingInterests: { _tag: 'No' },
        language: 'en',
        content: {
          _tag: 'Full',
          text: html`<h1>Some title</h1>
            <p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>`,
        },
        topics: [],
      }),
    ])
  },
})

test.extend(canLogIn).extend(hasAVerifiedEmailAddress).extend(willPublishAComment)(
  'can write a comment on a PREreview',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/reviews/1061864', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Write a comment' }).click()

    await expect(page.getByRole('main')).toContainText('We will ask you to log in')

    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))

    await page.getByLabel('Write your comment').click()
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
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Publish comment' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We’re publishing your comment')

    if (javaScriptEnabled) {
      await expect(page.getByRole('link', { name: 'Continue' })).not.toBeVisible()

      await page.getByRole('link', { name: 'Continue' }).click()

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Comment published')
    } else {
      await expect(async () => {
        await page.getByRole('link', { name: 'Reload page' }).click()

        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Comment published')
      }).toPass()
    }

    await page.getByRole('link', { name: 'Back to PREreview' }).click()

    const comments = page.getByRole('article', { name: 'Comments', exact: true })

    await expect(comments).toContainText('Some title')
    if (javaScriptEnabled) {
      await expect(comments).toContainText('Lorem ipsum dolor sit “amet”, consectetur adipiscing elit.')
    } else {
      await expect(comments).toContainText('Lorem ipsum dolor sit "amet", consectetur adipiscing elit.')
    }
    await expect(comments).toContainText('Josiah Carberry')
    await expect(comments).toContainText(
      'Competing interests The author of this comment declares that they have no competing interests.',
    )
  },
)

test('can choose a locale before starting', async ({ page }) => {
  await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Escrever um comentário')
})

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can change the comment after previewing',
  async ({ page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your comment' })).toHaveText(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    )

    await page.getByRole('link', { name: 'Change comment' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))

    await page.getByLabel('Write your comment').focus()
    await waitForProseMirrorFocus(page.getByLabel('Write your comment'))
    await page
      .getByLabel('Write your comment')
      .fill('Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('region', { name: 'Your comment' })).toHaveText(
      'Donec vestibulum consectetur nunc, non vestibulum felis gravida nec.',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can change your name after previewing',
  async ({ page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
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
  'can change the competing interests after previewing',
  async ({ page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText(
      'Competing interests The author of this comment declares that they have no competing interests.',
    )

    await page.getByRole('link', { name: 'Change competing interests' }).click()

    await page.getByLabel('Yes').check()
    await page.getByLabel('What are they?').fill('Maecenas sed dapibus massa.')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Competing interests Maecenas sed dapibus massa.')
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a comment on a PREreview',
  async ({ page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What name would you like to use?')
    await page.goto('/reviews/1061864', { waitUntil: 'commit' })
    await page.getByRole('link', { name: 'Write a comment' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a comment')
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What name would you like to use?')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'can go back through the form',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your comment')

    await page.goBack()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.goBack()

    await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

    await page.goBack()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your comment')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Write your comment')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }

    await page.goBack()

    await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'see existing values when going back a step',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your comment')

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('I’m following the Code of Conduct')).toBeChecked()

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('No')).toBeChecked()

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    await expect(page.getByLabel('Josiah Carberry')).toBeChecked()

    await page.getByRole('navigation').getByRole('link', { name: 'Back' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByLabel('Write your comment')).toHaveText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    } else {
      await expect(page.getByLabel('Write your comment')).toHaveValue(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      )
    }
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to give your email address',
  async ({ javaScriptEnabled, emails, page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
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
    await expect(page.getByRole('alert', { name: 'Success' })).toContainText('verified')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(hasAnUnverifiedEmailAddress)(
  'have to verify your email address',
  async ({ javaScriptEnabled, emails, page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('I’m following the Code of Conduct').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact details')
    await expect(page.getByLabel('What is your email address?')).toHaveValue('jcarberry@example.com')

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email address')

    await page.setContent(String(emails[0]?.html))

    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Verify email address' }).click()
    page = await opener

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your comment')
    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('alert', { name: 'Success' })).toContainText('verified')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
  },
)

test.extend(canLogIn).extend(areLoggedIn)("aren't told about ORCID when already logged in", async ({ page }) => {
  await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write a comment')
  await expect(page.getByRole('main')).not.toContainText('ORCID')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write your comment')
})

test.extend(canLogIn).extend(areLoggedIn)('have to enter a comment', async ({ javaScriptEnabled, page }) => {
  await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await waitForEditor(page.getByLabel('Write your comment'))
  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('Write your comment')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter your comment' }).click()

  await expect(page.getByLabel('Write your comment')).toBeFocused()

  await waitForProseMirrorFocus(page.getByLabel('Write your comment'))
  await page.keyboard.press('Enter')
  await page.keyboard.type('  ')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('Write your comment')).toHaveAttribute('aria-invalid', 'true')
})

test.extend(canLogIn).extend(areLoggedIn)('have to choose a name', async ({ javaScriptEnabled, page }) => {
  await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await waitForEditor(page.getByLabel('Write your comment'))
  await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('group', { name: 'What name would you like to use?' })).toBeVisible()
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
  'have to declare any competing interests',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('group', { name: 'Do you have any competing interests?' })).toBeVisible()
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
  'have to agree to the Code of Conduct',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await waitForEditor(page.getByLabel('Write your comment'))
    await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByLabel('No').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('group', { name: 'Code of Conduct' })).toBeVisible()
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
  await page.goto('/reviews/1061864/write-a-comment', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await waitForEditor(page.getByLabel('Write your comment'))
  await page.getByLabel('Write your comment').fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I’m following the Code of Conduct').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByLabel('What is your email address?')).toBeVisible()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter your email address' }).click()

  await expect(page.getByLabel('What is your email address?')).toBeFocused()

  await page.getByLabel('What is your email address?').fill('not an email address')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter an email address in the correct format, like name@example.com' }).click()

  await expect(page.getByLabel('What is your email address?')).toBeFocused()
})
