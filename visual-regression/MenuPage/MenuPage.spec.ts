import { Option } from 'effect'
import { DefaultLocale } from '../../src/locales/index.ts'
import { createMenuPage } from '../../src/WebApp/MenuPage/MenuPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(
    createMenuPage({ locale: DefaultLocale, isLoggedIn: false, userOnboarding: Option.none() }),
  )

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a user', async ({ showPage }) => {
  const content = await showPage(
    createMenuPage({ locale: DefaultLocale, isLoggedIn: true, userOnboarding: Option.none() }),
  )

  await expect(content).toHaveScreenshot()
})

test("content looks right when the user hasn't seen the my details page", async ({ showPage }) => {
  const content = await showPage(
    createMenuPage({
      locale: DefaultLocale,
      isLoggedIn: true,
      userOnboarding: Option.some({ seenMyDetailsPage: false }),
    }),
  )

  await expect(content).toHaveScreenshot()
})
