
'use client';

import React, { useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Building } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useSettings } from '@/contexts/settings-context';

export default function LoginPage() {
    const { login } = useUser();
    const { activeBranch } = useSettings();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const t = useTranslations('LoginPage');
    const locale = useLocale();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = login(username, password);
        if (!result.success && result.message) {
            setError(t(result.message as any));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-2 mb-2">
                        <Building className="h-8 w-8 text-primary" />
                        <h1 className="text-2xl font-bold text-primary font-headline">{activeBranch?.name || 'Rawnak Sales'}</h1>
                    </div>
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{t('errorTitle')}</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="username">{t('usernameLabel')}</Label>
                            <Input id="username" type="text" placeholder="e.g. admin" required value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('passwordLabel')}</Label>
                            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <Button type="submit" className="w-full">{t('loginButton')}</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
