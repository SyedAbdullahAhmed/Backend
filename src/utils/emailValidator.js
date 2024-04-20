import { validate } from 'deep-email-validator'

const emailValidator = async (email) => {
  console.log(email);
  let res = await validate(email)
  console.log(res.validators.smtp.valid);
  return res.validators.smtp.valid
}
export { emailValidator }