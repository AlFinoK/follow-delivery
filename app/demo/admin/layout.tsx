import { AdminThemeShell } from '@/components/AdminThemeShell'

// Тёмная тема действует только внутри /demo/admin (scoped .dark). См. AdminThemeShell.
export default function DemoAdminLayout({ children }: { children: React.ReactNode }) {
	return <AdminThemeShell>{children}</AdminThemeShell>
}
