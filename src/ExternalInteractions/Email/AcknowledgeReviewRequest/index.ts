import { flow } from 'effect'
import { Nodemailer } from '../../../ExternalApis/index.ts'
import { CreateEmail } from './CreateEmail.ts'

export const AcknowledgeReviewRequest = flow(CreateEmail, Nodemailer.sendEmail)
