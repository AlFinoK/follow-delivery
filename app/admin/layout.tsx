import { AdminThemeShell } from '@/components/AdminThemeShell'

// Тёмная тема действует только внутри /admin (scoped .dark). См. AdminThemeShell.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return <AdminThemeShell>{children}</AdminThemeShell>
}
