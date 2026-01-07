import { Option } from 'effect'
import { DefaultLocale } from '../../src/locales/index.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import type { User } from '../../src/user.ts'
import { createMenuPage } from '../../src/WebApp/MenuPage/MenuPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(
    createMenuPage({ locale: DefaultLocale, user: Option.none(), userOnboarding: Option.none() }),
  )

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a user', async ({ showPage }) => {
  const content = await showPage(
    createMenuPage({ locale: DefaultLocale, user: Option.some(user), userOnboarding: Option.none() }),
  )

  await expect(content).toHaveScreenshot()
})

test("content looks right when the user hasn't seen the my details page", async ({ showPage }) => {
  const content = await showPage(
    createMenuPage({
      locale: DefaultLocale,
      user: Option.some(user),
      userOnboarding: Option.some({ seenMyDetailsPage: false }),
    }),
  )

  await expect(content).toHaveScreenshot()
})

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
