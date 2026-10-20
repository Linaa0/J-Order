import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      phone: string
      role: string
      preferredLanguage: string
      staffCategories: string[]
      mustChangePassword?: boolean
    }
  }

  interface User extends DefaultUser {
    phone: string
    role: string
    preferredLanguage: string
    staffCategories: string[]
    mustChangePassword?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    phone: string
    role: string
    preferredLanguage: string
    staffCategories: string[]
    mustChangePassword?: boolean
  }
}
