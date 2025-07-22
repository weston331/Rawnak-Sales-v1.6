
'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import PageHeader from '@/components/shared/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, ShieldCheck, ShieldAlert, MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, type User } from '@/contexts/user-context';
import { useToast } from '@/hooks/use-toast';
import { redirect, usePathname } from 'next/navigation';

const defaultUserFormState = {
    name: '',
    username: '',
    password: '',
    avatarUrl: '',
    role: 'Employee' as const,
    status: 'Active' as const,
    permissions: {
        manageSales: true,
        manageProducts: true,
        manageInventory: false,
        manageDebts: false,
        manageUsers: false,
    }
};

export default function UsersPage() {
  const t = useTranslations('UsersPage');
  const tg = useTranslations('General');
  const { users, currentUser, addUser, updateUser, deleteUser } = useUser();
  const { toast } = useToast();
  const locale = useLocale();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);
  const [modalUserData, setModalUserData] = React.useState<typeof defaultUserFormState>(defaultUserFormState);

  // Route protection
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'Admin') {
      redirect(`/${locale}/dashboard`);
    }
  }, [currentUser, locale]);

  if (!currentUser || currentUser.role !== 'Admin') {
    return null; // or a loading/unauthorized component
  }

  const handleOpenModal = (user?: User) => {
    if (user) {
        setEditingUser(user);
        setModalUserData({
            name: user.name,
            username: user.username,
            password: '', // Don't show password for editing
            avatarUrl: user.avatarUrl || '',
            role: user.role,
            status: user.status,
            permissions: user.permissions
        });
    } else {
        setEditingUser(null);
        setModalUserData(defaultUserFormState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setModalUserData(defaultUserFormState);
  };

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setModalUserData(prev => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (role: 'Admin' | 'Employee') => {
      if (role === 'Admin') {
          // If role is Admin, force all permissions to true and disable checkboxes
          setModalUserData(prev => ({
              ...prev,
              role,
              permissions: {
                  manageSales: true,
                  manageProducts: true,
                  manageInventory: true,
                  manageDebts: true,
                  manageUsers: true
              }
          }));
      } else {
          // If changing to Employee, just update the role.
          // Checkboxes will become enabled, retaining their current checked state.
          // This allows for customizing permissions for employees.
          setModalUserData(prev => ({
              ...prev,
              role,
          }));
      }
  };
  
  const handlePermissionChange = (perm: keyof typeof modalUserData.permissions, checked: boolean) => {
    setModalUserData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [perm]: checked
      }
    }));
  }

  const handleSaveUser = () => {
    if (!modalUserData.name || !modalUserData.username) {
        toast({ title: t('errorTitle'), description: t('fillAllFieldsError'), variant: "destructive" });
        return;
    }

    if (editingUser) {
        const userData: Partial<Omit<User, 'id'>> = {
            name: modalUserData.name,
            username: modalUserData.username,
            role: modalUserData.role,
            status: modalUserData.status,
            avatarUrl: modalUserData.avatarUrl,
            permissions: modalUserData.permissions,
        };
        // Optionally update password if a new one is entered
        if (modalUserData.password) {
            userData.password = modalUserData.password;
        }
        updateUser(editingUser.id, userData);
        toast({ title: t('userUpdatedTitle'), description: t('userUpdatedDescription', { name: userData.name }) });
    } else {
        if (!modalUserData.password) {
            toast({ title: t('errorTitle'), description: t('passwordRequiredError'), variant: "destructive" });
            return;
        }
        const userData: Omit<User, 'id'> = {
            name: modalUserData.name,
            username: modalUserData.username,
            password: modalUserData.password,
            avatarUrl: modalUserData.avatarUrl,
            role: modalUserData.role,
            status: modalUserData.status,
            permissions: modalUserData.permissions,
        };
        addUser(userData);
        toast({ title: t('userAddedTitle'), description: t('userAddedDescription', { name: userData.name }) });
    }
    handleCloseModal();
  };


  const handleConfirmDelete = () => {
      if (userToDelete) {
          deleteUser(userToDelete.id);
          toast({ title: t('userDeletedTitle'), description: t('userDeletedDescription', {name: userToDelete.name}), variant: "destructive" });
          setUserToDelete(null);
      }
  };
  
  const getRoleBadge = (role: string) => {
    if (role === 'Admin') return <Badge className="items-center gap-1 bg-primary/20 text-primary hover:bg-primary/30 border-primary/50"><ShieldCheck className="h-3 w-3"/>{t('adminRole')}</Badge>;
    return <Badge variant="secondary" className="items-center gap-1"><ShieldAlert className="h-3 w-3"/>{t('employeeRole')}</Badge>;
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="h-4 w-4" /> {t('addNewUser')}
          </Button>
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingUser ? t('editUserModalTitle') : t('addUserModalTitle')}</DialogTitle>
            <DialogDescription>
              {editingUser ? t('editUserModalDescription') : t('addUserModalDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('fullNameLabel')}</Label>
              <Input id="name" value={modalUserData.name} onChange={handleFormInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">{t('usernameLabel')}</Label>
              <Input id="username" type="text" value={modalUserData.username} onChange={handleFormInputChange} className="col-span-3" />
            </div>
             
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">{t('passwordLabel')}</Label>
                <Input id="password" type="password" value={modalUserData.password} onChange={handleFormInputChange} className="col-span-3" placeholder={editingUser ? t('passwordOptionalPlaceholder') : ''}/>
              </div>

               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="avatarUrl" className="text-right">{t('avatarUrlLabel')}</Label>
                <Input id="avatarUrl" type="url" value={modalUserData.avatarUrl} onChange={handleFormInputChange} className="col-span-3" placeholder={t('avatarUrlPlaceholder')}/>
              </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">{t('roleLabel')}</Label>
              <Select value={modalUserData.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('selectRolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">{t('adminRole')}</SelectItem>
                  <SelectItem value="Employee">{t('employeeRole')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
             {editingUser && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">{t('statusLabel')}</Label>
                     <Select value={modalUserData.status} onValueChange={(value) => setModalUserData(prev => ({...prev, status: value as 'Active' | 'Inactive'}))}>
                        <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={t('selectStatusPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Active">{t('activeStatus')}</SelectItem>
                        <SelectItem value="Inactive">{t('inactiveStatus')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="col-span-4">
                <Label className="font-medium">{t('permissionsLabel')}</Label>
                <div className="mt-2 space-y-2 p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="perm-sales" checked={modalUserData.permissions.manageSales} onCheckedChange={(checked) => handlePermissionChange('manageSales', !!checked)} disabled={modalUserData.role === 'Admin'}/>
                        <Label htmlFor="perm-sales" className="font-normal">{t('manageSalesPermission')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="perm-products" checked={modalUserData.permissions.manageProducts} onCheckedChange={(checked) => handlePermissionChange('manageProducts', !!checked)} disabled={modalUserData.role === 'Admin'}/>
                        <Label htmlFor="perm-products" className="font-normal">{t('manageProductsPermission')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="perm-inventory" checked={modalUserData.permissions.manageInventory} onCheckedChange={(checked) => handlePermissionChange('manageInventory', !!checked)} disabled={modalUserData.role === 'Admin'}/>
                        <Label htmlFor="perm-inventory" className="font-normal">{t('manageInventoryPermission')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="perm-debts" checked={modalUserData.permissions.manageDebts} onCheckedChange={(checked) => handlePermissionChange('manageDebts', !!checked)} disabled={modalUserData.role === 'Admin'}/>
                        <Label htmlFor="perm-debts" className="font-normal">{t('manageDebtsPermission')}</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="perm-users" checked={modalUserData.permissions.manageUsers} onCheckedChange={(checked) => handlePermissionChange('manageUsers', !!checked)} disabled={modalUserData.role !== 'Admin'} />
                        <Label htmlFor="perm-users" className="font-normal">{t('manageUsersPermission')}</Label>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>{tg('cancel')}</Button>
            <Button type="submit" onClick={handleSaveUser}>{editingUser ? t('saveChangesButton') : t('createUserButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteUserConfirmTitle', {name: userToDelete?.name})}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteUserConfirmDescription', {name: userToDelete?.name})}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)}>{tg('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })}>
                    {tg('delete')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tg('no')}</TableHead>
              <TableHead>{t('tableHeaderName')}</TableHead>
              <TableHead>{t('tableHeaderUsername')}</TableHead>
              <TableHead>{t('tableHeaderRole')}</TableHead>
              <TableHead>{t('tableHeaderStatus')}</TableHead>
              <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono">{index + 1}</TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>
                  <Badge variant={user.status === 'Active' ? 'default' : 'outline'}>
                    {user.status === 'Active' ? t('activeStatus') : t('inactiveStatus')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenModal(user)}>
                        <Edit className="h-4 w-4" /> {t('actionEditUser')}
                      </DropdownMenuItem>
                       <DropdownMenuItem disabled>
                        {t('actionResetPassword')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator/>
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setUserToDelete(user)} disabled={currentUser.id === user.id}>
                        <Trash2 className="h-4 w-4" /> {t('actionDeleteUser')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {users.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        {t('noUsersFound')}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
