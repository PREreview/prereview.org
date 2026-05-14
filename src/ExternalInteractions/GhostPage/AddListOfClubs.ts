import { Array, pipe, String, Tuple } from 'effect'
import { ClubIdSchema, getClubName } from '../../Clubs/index.ts'
import { html, rawHtml, type Html } from '../../html.ts'
import { DefaultLocale, type SupportedLocale } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'

export const addListOfClubs = (locale: SupportedLocale) => (text: Html) =>
  rawHtml(
    text.value.replace('{{list-of-clubs}}', () => {
      const clubs = pipe(
        ClubIdSchema.literals,
        Array.map(clubId => Tuple.make(clubId, getClubName(clubId))),
        Array.sortWith(Tuple.getSecond, (a, b) =>
          String.localeCompare(b, [locale, DefaultLocale], { sensitivity: 'base' })(a),
        ),
      )

      return html`
        <ul>
          ${Array.map(clubs, ([id, name]) => {
            return html`
              <li>
                <a href="${Routes.ClubProfile.href({ id })}">${name}</a>
              </li>
            `
          })}
        </ul>
      `.toString()
    }),
  )
