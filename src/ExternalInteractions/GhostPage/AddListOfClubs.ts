import { Array, pipe, String, Struct } from 'effect'
import type { ClubName } from '../../Clubs/index.ts'
import { html, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'

export const addListOfClubs = (locale: SupportedLocale, clubs: Array.NonEmptyReadonlyArray<ClubName>) => (text: Html) =>
  rawHtml(
    text.value.replace('{{list-of-clubs}}', () =>
      html`
        <ul>
          ${pipe(
            Array.sortWith(clubs, Struct.get('name'), (a, b) =>
              String.localeCompare(b, locale, { sensitivity: 'base' })(a),
            ),
            Array.map(club => {
              return html`
                <li>
                  <a href="${Routes.ClubProfile.href({ slug: club.slug })}" ${languageAttributesFor(club.language)}
                    >${club.name}</a
                  >
                </li>
              `
            }),
          )}
        </ul>
      `.toString(),
    ),
  )
