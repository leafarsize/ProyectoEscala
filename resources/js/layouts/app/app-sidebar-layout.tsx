import { AppContent } from '@/components/app-content';
import { AppFooter } from '@/components/app-footer';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="flex min-w-0 flex-1 flex-col overflow-x-clip pb-20 md:pb-0"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="flex-1">{children}</div>
                <AppFooter />
            </AppContent>
            <MobileBottomNav />
        </AppShell>
    );
}
