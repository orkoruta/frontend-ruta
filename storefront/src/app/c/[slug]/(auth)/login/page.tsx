import { LoginForm } from './LoginForm'

// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/login path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_' }]
}

export default function LoginPage() {
  return <LoginForm />
}
