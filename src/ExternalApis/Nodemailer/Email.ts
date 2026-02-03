import type { Html } from '../../html.ts'
import type { EmailAddress } from '../../types/index.ts'

export interface Email {
  readonly from: { readonly name: string; readonly address: EmailAddress.EmailAddress }
  readonly to: { readonly name: string; readonly address: EmailAddress.EmailAddress }
  readonly subject: string
  readonly text: string
  readonly html: Html
}
