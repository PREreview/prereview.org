import { Data, type Option } from 'effect'
import type { Html } from '../../../html.ts'
import type { UserSelectableLanguage } from '../../../locales/index.ts'
import type { Doi, NonEmptyString } from '../../../types/index.ts'
import type { PreprintId } from '../../Preprints/index.ts'
import type { Persona } from '../../Prereviewers/index.ts'

export interface DataForZenodoRecord {
  readonly author: Persona
  readonly comment: Html
  readonly competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  readonly language: Option.Option<UserSelectableLanguage>
  readonly prereview: {
    readonly doi: Doi.Doi
    readonly url: URL
    readonly preprint: {
      readonly id: PreprintId
      readonly title: Html
    }
  }
}

export class DataForZenodoRecordIsUnavailable extends Data.TaggedError('DataForZenodoRecordIsUnavailable')<{
  cause?: unknown
}> {}
