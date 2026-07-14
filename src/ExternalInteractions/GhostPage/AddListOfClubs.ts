import { Array, pipe, String, Tuple } from 'effect'
import { ClubIdSchema, getClubName, getClubSlug } from '../../Clubs/index.ts'
import { html, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'

export const addListOfClubs = (locale: SupportedLocale) => (text: Html) =>
  rawHtml(
    text.value.replace('{{list-of-clubs}}', () => {
      const clubs = pipe(
        ClubIdSchema.literals,
        Array.map(clubId => Tuple.make(getClubSlug(clubId), getClubName(clubId))),
        Array.sortWith(Tuple.getSecond, (a, b) =>
          String.localeCompare(b.text, locale, { sensitivity: 'base' })(a.text),
        ),
      )

      return html`
        <ul>
          ${Array.map(clubs, ([slug, name]) => {
            return html`
              <li>
                <a href="${Routes.ClubProfile.href({ slug })}" ${languageAttributesFor(name.language)}>${name.text}</a>
              </li>
            `
          })}
        </ul>
      `.toString()
    }),
  )
