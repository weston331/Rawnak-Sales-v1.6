
'use client';

import * as React from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {useTranslations, useLocale} from 'next-intl';
import PageHeader from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building, Palette, Bell, Lock, FileText, Coins, GitBranchPlus, CloudUpload, SlidersHorizontal, Trash2, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from '@/contexts/currency-context';
import { currencies as availableCurrencies } from '@/lib/currencies';
import { useSettings, type Branch, type NotificationSettings, type InvoiceSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';


const DataManagementCard = dynamic(() => import('@/components/settings/data-management-card'), {
  loading: () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  ),
  ssr: false,
});


export default function SettingsPage() {
  const t = useTranslations('SettingsPage');
  const tg = useTranslations('General');
  const tSidebar = useTranslations('AppSidebar');
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const { toast } = useToast();

  // Contexts for data export
  const { currentUser, changePassword } = useUser();

  // Route protection
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'Admin') {
      router.replace(`/${currentLocale}/dashboard`);
    }
  }, [currentUser, currentLocale, router]);


  // Settings Context
  const { 
    activeBranch, 
    branches, 
    notificationSettings,
    invoiceSettings,
    updateActiveBranchInfo, 
    updateNotificationSettings,
    updateInvoiceSettings,
    switchBranch,
    addBranch,
    deleteBranch
  } = useSettings();

  // Local state for form inputs to avoid re-rendering on every keystroke in context
  const [localBranchInfo, setLocalBranchInfo] = React.useState<Branch | null>(activeBranch);
  const [localNotifications, setLocalNotifications] = React.useState<NotificationSettings>(notificationSettings);
  const [localInvoiceSettings, setLocalInvoiceSettings] = React.useState<InvoiceSettings>(invoiceSettings);

  const [isManageBranchesModalOpen, setIsManageBranchesModalOpen] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState('');
  const [branchToDelete, setBranchToDelete] = React.useState<Branch | null>(null);
  
  // Password change state
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = React.useState(false);
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  React.useEffect(() => {
    setLocalBranchInfo(activeBranch);
  }, [activeBranch]);

  React.useEffect(() => {
    setLocalNotifications(notificationSettings);
  }, [notificationSettings]);

  React.useEffect(() => {
    setLocalInvoiceSettings(invoiceSettings);
  }, [invoiceSettings]);

  const handleBranchInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!localBranchInfo) return;
    setLocalBranchInfo({ ...localBranchInfo, [e.target.id]: e.target.value });
  };
  
  const handleSaveBranchInfo = () => {
    if (localBranchInfo) {
      updateActiveBranchInfo(localBranchInfo);
      toast({ title: tg('save'), description: t('branchInfoSaved') });
    }
  };

  const handleAddNewBranch = () => {
    if (!newBranchName.trim()) {
      toast({ title: t('errorTitle'), description: t('branchNameRequiredError'), variant: 'destructive'});
      return;
    }
    addBranch(newBranchName.trim())
      .then((newBranch) => {
        if (newBranch) {
            toast({ title: t('successTitle'), description: t('branchAddedSuccess', { branchName: newBranch.name })});
            setNewBranchName('');
        }
      })
      .catch((error) => {
        toast({ title: t('errorTitle'), description: error.message, variant: 'destructive' });
      });
  };
  
  const handleDeleteBranch = () => {
    if (!branchToDelete) return;
    deleteBranch(branchToDelete.id)
      .then(() => {
        toast({ title: t('successTitle'), description: t('branchDeletedSuccess', { branchName: branchToDelete.name }) });
        setBranchToDelete(null);
        // Close manage modal if the last non-main branch is deleted
        if (branches.length <= 2) { 
            setIsManageBranchesModalOpen(false);
        }
      })
      .catch((error) => {
        let descriptionKey = 'cannotDeleteMainBranchError'; // Default
        if (error.message === 'permission_denied') {
          descriptionKey = 'permissionDeniedError';
        }
        toast({ title: t(descriptionKey as any), variant: 'destructive' });
        setBranchToDelete(null);
      });
  };

  const handleNotificationSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalNotifications({ ...localNotifications, [e.target.id]: e.target.value });
  };

  const handleNotificationSwitchChange = (id: keyof NotificationSettings, checked: boolean) => {
    setLocalNotifications(prev => ({ ...prev, [id]: checked }));
  }

  const handleSaveNotifications = () => {
    updateNotificationSettings(localNotifications);
    toast({ title: tg('save'), description: t('notificationsSaved') });
  };

  const handleInvoiceSettingsChange = (key: keyof InvoiceSettings, value: any) => {
    setLocalInvoiceSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveInvoiceSettings = () => {
    updateInvoiceSettings(localInvoiceSettings);
    toast({ title: tg('save'), description: t('invoiceSettingsSaved') });
  };


  // Appearance state
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  const { selectedCurrency, changeCurrency } = useCurrency();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dm = localStorage.getItem('darkMode') === 'true';
      setIsDarkMode(dm);
      if (dm) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    if (newIsDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
    }
  };

  const handleLanguageChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    window.location.pathname = newPathname;
  };
  
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.id]: e.target.value });
  };
  
  const handleSaveChangesPassword = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentUser) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
        toast({ title: t('errorTitle'), description: t('fillAllPasswordFieldsError'), variant: 'destructive'});
        return;
    }
    if (newPassword.length < 6) {
        toast({ title: t('errorTitle'), description: t('passwordTooShortError'), variant: 'destructive'});
        return;
    }
    if (newPassword !== confirmPassword) {
        toast({ title: t('errorTitle'), description: t('passwordsDoNotMatchError'), variant: 'destructive'});
        return;
    }
    
    const result = changePassword(currentUser.id, currentPassword, newPassword);

    if (result.success) {
        toast({ title: t('successTitle'), description: t('passwordChangedSuccess') });
        setIsChangePasswordModalOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: ''});
    } else {
        toast({ title: t(result.message as any), variant: 'destructive' });
    }
  };


  // Account security placeholders
  const handleNotImplemented = () => {
    toast({ title: t('accountSecurityTitle'), description: 'This feature is not yet available in this demo.', variant: 'default' });
  }

  const devName = currentLocale === 'ar' ? 'محمد شمخي' : 'Mohammed Shamkhi';

  if (!currentUser || currentUser.role !== 'Admin') {
    return null; // Render nothing or a loading/unauthorized state
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Dialog open={isManageBranchesModalOpen} onOpenChange={setIsManageBranchesModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('manageBranchesModalTitle')}</DialogTitle>
                <DialogDescription>{t('manageBranchesModalDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-branch-name">{t('addNewBranchButton')}</Label>
                    <div className="flex gap-2">
                      <Input 
                          id="new-branch-name" 
                          value={newBranchName} 
                          onChange={(e) => setNewBranchName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewBranch(); }}
                          placeholder="e.g., Baghdad Central Branch"
                      />
                      <Button onClick={handleAddNewBranch}>{t('addBranchButton')}</Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('existingBranchesLabel')}</Label>
                    <div className="flex flex-col gap-2 rounded-md border p-3 bg-muted/50 max-h-60 overflow-y-auto">
                        {branches.map(branch => (
                            <div key={branch.id} className="flex items-center justify-between gap-2 p-1 rounded-md hover:bg-background/50 group">
                                <span className="text-sm font-medium">{branch.name}</span>
                                {branch.id !== 'main' && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" title={t('deleteBranchButton')} onClick={() => setBranchToDelete(branch)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setIsManageBranchesModalOpen(false)}>{tg('close')}</Button>
             </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!branchToDelete} onOpenChange={(isOpen) => !isOpen && setBranchToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteBranchConfirmTitle', { branchName: branchToDelete?.name })}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteBranchConfirmDescription')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBranchToDelete(null)}>{tg('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBranch} className={buttonVariants({ variant: "destructive" })}>
                    {tg('delete')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> {t('branchManagementTitle')}</CardTitle>
                    <CardDescription>{t('branchManagementDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="active-branch">{t('activeBranchLabel')}</Label>
                        <Select value={activeBranch?.id || ''} onValueChange={switchBranch}>
                            <SelectTrigger id="active-branch">
                                <SelectValue placeholder={t('selectBranchPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                     <Button variant="outline" className="w-full" onClick={() => setIsManageBranchesModalOpen(true)}>
                        <SlidersHorizontal className="h-4 w-4" /> {t('manageBranchesButton')}
                    </Button>
                    
                    <Separator/>

                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">{t('editBranchInfoTitle')}</h4>
                      <p className="text-sm text-muted-foreground">{t('editBranchInfoDescription')}</p>
                    </div>

                    <div>
                        <Label htmlFor="name">{t('branchNameLabel')}</Label>
                        <Input id="name" value={localBranchInfo?.name || ''} onChange={handleBranchInfoChange} />
                    </div>
                    <div>
                        <Label htmlFor="contact">{t('branchContactLabel')}</Label>
                        <Input id="contact" type="tel" value={localBranchInfo?.contact || ''} onChange={handleBranchInfoChange} />
                    </div>
                    <Button onClick={handleSaveBranchInfo} disabled={!activeBranch}>{t('saveBranchInfoButton')}</Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> {t('accountSecurityTitle')}</CardTitle>
                    <CardDescription>{t('accountSecurityDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">{t('changePasswordButton')}</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('changePasswordModalTitle')}</DialogTitle>
                                <DialogDescription>{t('changePasswordModalDescription')}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="currentPassword">{t('currentPasswordLabel')}</Label>
                                    <Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={handlePasswordInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="newPassword">{t('newPasswordLabel')}</Label>
                                    <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="confirmPassword">{t('confirmNewPasswordLabel')}</Label>
                                    <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsChangePasswordModalOpen(false)}>{tg('cancel')}</Button>
                                <Button onClick={handleSaveChangesPassword}>{t('savePasswordButton')}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <Label htmlFor="2fa-switch" className="flex flex-col space-y-1">
                        <span>{t('twoFactorAuthLabel')}</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            {t('twoFactorAuthDescription')}
                        </span>
                        </Label>
                        <Switch id="2fa-switch" onCheckedChange={handleNotImplemented} />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> {t('appearanceTitle')}</CardTitle>
                    <CardDescription>{t('appearanceDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <Label htmlFor="darkMode-switch" className="flex flex-col space-y-1">
                        <span>{t('darkModeLabel')}</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            {t('darkModeDescription')}
                        </span>
                        </Label>
                        <Switch id="darkMode-switch" checked={isDarkMode} onCheckedChange={toggleDarkMode}/>
                    </div>
                     <div>
                        <Label htmlFor="language">{t('languageLabel')}</Label>
                        <Select value={currentLocale} onValueChange={handleLanguageChange}>
                            <SelectTrigger id="language" className="w-full">
                                <SelectValue placeholder={t('selectLanguagePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">{t('english')}</SelectItem>
                                <SelectItem value="ar">{t('arabic')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" /> {t('currencySettingsTitle')}
                </CardTitle>
                <CardDescription>{t('currencySettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="currency">{t('displayCurrencyLabel')}</Label>
                  <Select value={selectedCurrency.code} onValueChange={changeCurrency}>
                    <SelectTrigger id="currency" className="w-full">
                      <SelectValue placeholder={t('selectCurrencyPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.name} ({currency.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> {t('notificationsTitle')}</CardTitle>
                    <CardDescription>{t('notificationsDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <Label htmlFor="lowStockAlerts" className="flex flex-col space-y-1">
                        <span>{t('lowStockAlertsLabel')}</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            {t('lowStockAlertsDescription')}
                        </span>
                        </Label>
                        <Switch id="lowStockAlerts" checked={localNotifications.lowStockAlerts} onCheckedChange={(checked) => handleNotificationSwitchChange('lowStockAlerts', checked)} />
                    </div>
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <Label htmlFor="debtReminders" className="flex flex-col space-y-1">
                        <span>{t('debtRemindersLabel')}</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            {t('debtRemindersDescription')}
                        </span>
                        </Label>
                        <Switch id="debtReminders" checked={localNotifications.debtReminders} onCheckedChange={(checked) => handleNotificationSwitchChange('debtReminders', checked)} />
                    </div>
                     <div>
                        <Label htmlFor="updatesEmail">{t('emailForUpdatesLabel')}</Label>
                        <Input id="updatesEmail" type="email" value={localNotifications.updatesEmail} onChange={handleNotificationSettingsChange} />
                    </div>
                     <div>
                        <Label>{t('getUpdatesOnTelegram')}</Label>
                        <a href="https://t.me/infby2" target="_blank" rel="noopener noreferrer" className="block">
                            <Button variant="outline" className="w-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.88-1.44 6.84c-.14.68-.58.84-1.14.52l-2.2-1.62-1.08 1.04c-.12.12-.22.22-.44.22l.16-2.26 4.14-3.72c.18-.16-.06-.24-.3-.1L8.3 12.32l-2.14-.66c-.68-.22-.7-.68.14-1.02l8.8-3.4c.58-.22 1.02.16.84.94z"/>
                                </svg>
                                {t('joinTelegramChannel')}
                            </Button>
                        </a>
                    </div>
                     <Button onClick={handleSaveNotifications}>{t('saveNotificationSettingsButton')}</Button>
                </CardContent>
            </Card>
            
            <DataManagementCard onSuccess={() => window.location.reload()} />

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> {t('invoiceSettingsTitle')}</CardTitle>
                    <CardDescription>{t('invoiceSettingsDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="invoice-template">{t('invoiceTemplateLabel')}</Label>
                        <Select 
                            value={localInvoiceSettings.template}
                            onValueChange={(value: 'standard' | 'compact') => handleInvoiceSettingsChange('template', value)}
                        >
                            <SelectTrigger id="invoice-template">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">{t('standardTemplate')}</SelectItem>
                                <SelectItem value="compact">{t('compactTemplate')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="footerText">{t('customFooterLabel')}</Label>
                        <Textarea
                            id="footerText"
                            placeholder={t('customFooterPlaceholder')}
                            value={localInvoiceSettings.footerText}
                            onChange={(e) => handleInvoiceSettingsChange('footerText', e.target.value)}
                            rows={4}
                        />
                    </div>
                    <Button onClick={handleSaveInvoiceSettings}>{t('saveInvoiceSettingsButton')}</Button>
                </CardContent>
            </Card>

        </div>
      </div>
      <div className="text-center text-sm text-muted-foreground mt-8">
          <p>{tSidebar('developedBy', { name: devName })}</p>
          <p>{tSidebar('version', { number: '1.6' })}</p>
      </div>
    </>
  );
}
