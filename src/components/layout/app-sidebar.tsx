
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import React, { useState, useCallback } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Archive,
  CreditCard,
  Users,
  Settings,
  LogOut,
  Building,
  Contact,
  ShieldAlert,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/settings-context';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const AppSidebar = () => {
  const t = useTranslations('AppSidebar');
  const tg = useTranslations('General');
  const tUsers = useTranslations('UsersPage');
  const pathnameWithLocale = usePathname();
  const locale = useLocale();
  const { activeBranch } = useSettings();
  const { currentUser, logout, updateUser } = useUser();
  const { toast } = useToast();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState(currentUser?.avatarUrl || '');
  
  // Remove locale prefix for active link checking
  const currentPathname = pathnameWithLocale.replace(new RegExp(`^/${locale}`), '') || '/';

  const navItems = [
    { href: '/dashboard', labelKey: 'dashboard', icon: LayoutGrid },
    { href: '/products', labelKey: 'products', icon: Package },
    { href: '/sales', labelKey: 'sales', icon: ShoppingCart },
    { href: '/inventory',labelKey: 'inventory', icon: Archive },
    { href: '/debts', labelKey: 'debts', icon: CreditCard },
    { href: '/customers', labelKey: 'customers', icon: Contact },
    { href: '/users', labelKey: 'users', icon: Users, adminOnly: true },
  ];
  
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly) {
        return currentUser?.role === 'Admin';
    }
    return true;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const userRole = currentUser?.role === 'Admin' ? tUsers('adminRole') : tUsers('employeeRole');

  const handleOpenAvatarModal = useCallback(() => {
    if (currentUser) {
      setNewAvatarUrl(currentUser.avatarUrl || '');
      setIsAvatarModalOpen(true);
    }
  }, [currentUser]);

  const handleSaveAvatar = useCallback(() => {
    if (currentUser) {
      updateUser(currentUser.id, { avatarUrl: newAvatarUrl })
        .then(() => {
          toast({ title: t('avatarUpdatedTitle'), description: t('avatarUpdatedDescription') });
          setIsAvatarModalOpen(false);
        })
        .catch(() => {
          toast({ title: tg('errorTitle'), variant: 'destructive' });
        });
    }
  }, [currentUser, newAvatarUrl, updateUser, toast, t, tg]);

  return (
    <>
      <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeAvatarTitle')}</DialogTitle>
            <DialogDescription>{t('changeAvatarDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                  <AvatarImage src={newAvatarUrl} alt={currentUser?.name || ''} data-ai-hint="user avatar"/>
                  <AvatarFallback className="text-3xl">{getInitials(currentUser?.name)}</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <Label htmlFor="avatar-url">{t('imageUrlLabel')}</Label>
              <Input
                id="avatar-url"
                value={newAvatarUrl}
                onChange={(e) => setNewAvatarUrl(e.target.value)}
                placeholder="https://example.com/image.png"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAvatarModalOpen(false)}>{tg('cancel')}</Button>
            <Button onClick={handleSaveAvatar}>{tg('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sidebar side={locale === 'ar' ? 'right' : 'left'} variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 shrink-0">
              <Building className="h-7 w-7" />
            </Button>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden transition-opacity duration-200 ease-linear">
              <h1 className="text-xl font-semibold text-primary font-headline">{activeBranch?.name || 'Rawnak Sales'}</h1>
              <p className="text-xs text-muted-foreground">{t('salesManagement')}</p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="flex-grow p-2">
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              const isActive = item.href === '/dashboard' 
                ? (currentPathname === '/' || currentPathname.startsWith('/dashboard'))
                : currentPathname.startsWith(item.href);
              
              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={`/${locale}${item.href}`} passHref>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={{ children: t(item.labelKey as any), side: locale === 'ar' ? 'left' : 'right', align: 'center' }}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{t(item.labelKey as any)}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <Separator className="my-2" />

        <SidebarFooter className="p-4 space-y-4">
          {currentUser?.role === 'Admin' && (
              <Link href={`/${locale}/settings`} passHref>
                  <SidebarMenuButton
                      isActive={currentPathname.startsWith("/settings")}
                      tooltip={{ children: t('settings'), side: locale === 'ar' ? 'left' : 'right', align: 'center' }}
                  >
                      <Settings className="h-5 w-5 flex-shrink-0" />
                      <span>{t('settings')}</span>
                  </SidebarMenuButton>
              </Link>
          )}
          
          <div className="flex items-center gap-3">
              <button onClick={handleOpenAvatarModal} className="relative group">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name || ''} data-ai-hint="user avatar"/>
                    <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
              </button>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden transition-opacity duration-200 ease-linear">
                  <span className="text-sm font-medium">{currentUser?.name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {currentUser?.role === 'Admin' ? <ShieldCheck className="h-3 w-3 text-primary"/> : <ShieldAlert className="h-3 w-3 text-muted-foreground"/>}
                      {userRole}
                  </span>
              </div>
              <Button variant="ghost" size="icon" className="ms-auto group-data-[collapsible=icon]:hidden" title={t('logout')} onClick={logout}>
                  <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
              </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
};

export default AppSidebar;
