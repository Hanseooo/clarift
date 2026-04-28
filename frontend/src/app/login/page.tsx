import type { Metadata } from "next"
import { LoginContent } from "./login-content"

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false },
}

export default function LoginPage() {
  return <LoginContent />
}
