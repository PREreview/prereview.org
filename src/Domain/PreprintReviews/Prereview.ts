import type { Array } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { ClubName } from '../Clubs/index.ts'
import type { Html } from '../../html.ts'
import type { Name } from '../../types/Name.ts'
import type { OrcidId } from '../../types/OrcidId.ts'

export interface PreprintPrereview {
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: Name; orcid?: OrcidId }>
    anonymous: number
  }
  club?: ClubName
  id: number
  language?: LanguageCode
  text: Html
}
