import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PawPrint, MessageSquare, Map, LayoutDashboard, LogOut, ShieldCheck, Building2, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function TopNav({ onReport }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const dashboardHref = user?.role === 'admin' ? '/admin' : user?.role === 'ngo' ? '/ngo' : user?.role === 'police' ? '/police' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="nav-mobile-open"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <MobileNav dashboardHref={dashboardHref} />
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <span className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="font-semibold tracking-tight">ULFN</span>
            <span className="hidden lg:inline text-xs text-muted-foreground">Universal Lost & Found Network</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/browse" className={`px-3 py-2 rounded-md hover:bg-muted ${loc.pathname === '/browse' ? 'bg-muted' : ''}`} data-testid="nav-browse"><Map className="inline h-4 w-4 mr-1" />Browse Map</Link>
          <Link to="/how-it-works" className="px-3 py-2 rounded-md hover:bg-muted" data-testid="nav-how">How it Works</Link>
          {user && (
            <Link to={dashboardHref} className="px-3 py-2 rounded-md hover:bg-muted" data-testid="nav-dashboard"><LayoutDashboard className="inline h-4 w-4 mr-1" />Dashboard</Link>
          )}
          {user && (
            <Link to="/messages" className="px-3 py-2 rounded-md hover:bg-muted" data-testid="nav-messages"><MessageSquare className="inline h-4 w-4 mr-1" />Messages</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Button onClick={onReport} className="hidden sm:inline-flex" data-testid="report-wizard-open-button">Report</Button>
          <ThemeToggle />
          <NotificationBell />
          {!user ? (
            <>
              <Button variant="ghost" onClick={() => nav('/login')} data-testid="nav-login">Sign in</Button>
              <Button variant="outline" onClick={() => nav('/register')} className="hidden sm:inline-flex" data-testid="nav-register">Sign up</Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="nav-user-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.picture} />
                    <AvatarFallback>{(user.name || user.email || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  <div className="text-xs mt-1 uppercase tracking-wide text-primary">{user.role}{user.verified ? ' · verified' : ''}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav(dashboardHref)}>Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/profile')}>Profile</DropdownMenuItem>
                {user.role === 'user' && (
                  <>
                    <DropdownMenuItem onClick={() => nav('/apply?kind=ngo')}><Building2 className="h-4 w-4 mr-2" />Apply as NGO</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav('/apply?kind=police')}><ShieldCheck className="h-4 w-4 mr-2" />Apply as Police</DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await logout(); nav('/'); }} data-testid="nav-logout"><LogOut className="h-4 w-4 mr-2" />Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileNav({ dashboardHref }) {
  const { user } = useAuth();
  const links = [
    { to: '/', label: 'Home' },
    { to: '/browse', label: 'Browse Map' },
    { to: '/how-it-works', label: 'How it Works' },
    ...(user ? [{ to: dashboardHref, label: 'Dashboard' }, { to: '/messages', label: 'Messages' }, { to: '/notifications', label: 'Notifications' }, { to: '/profile', label: 'Profile' }] : []),
    { to: '/login', label: 'Sign in' },
    { to: '/register', label: 'Sign up' },
  ];
  return (
    <nav className="flex flex-col gap-1 pt-8">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="px-3 py-2 rounded-md hover:bg-muted text-sm">{l.label}</Link>
      ))}
    </nav>
  );
}
