import { Effect, flow } from 'effect'
import { Nodemailer } from '../../../ExternalApis/index.ts'
import { CreateEmail } from './CreateEmail.ts'

export const InviteAuthor = flow(CreateEmail, Effect.andThen(Nodemailer.sendEmail))
