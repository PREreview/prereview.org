import { NonEmptyString } from '../../types/index.ts'

export const Folder = 'prereview-profile'

export const publicIdFor = (avatarId: NonEmptyString.NonEmptyString) =>
  NonEmptyString.NonEmptyString(`${Folder}/${avatarId}`)
