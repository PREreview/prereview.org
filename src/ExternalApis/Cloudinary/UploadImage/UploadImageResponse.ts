import { Schema } from 'effect'
import { NonEmptyStringSchema } from '../../../types/NonEmptyString.ts'

export const UploadImageResponse = Schema.Struct({
  public_id: NonEmptyStringSchema,
})
