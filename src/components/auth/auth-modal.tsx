'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Truck,
  User,
  Building2,
  Users,
  ArrowRight,
  Mail,
  Lock,
  UserCircle,
  Phone,
  Building,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore, type UserRole } from '@/lib/auth-store';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'register';
}

const roles: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'SHIPPER_PRIVATE',
    label: 'Privatkunde',
    description: 'Versenden Sie gelegentlich Pakete und Paletten',
    icon: <User className="w-6 h-6" />,
  },
  {
    value: 'SHIPPER_COMPANY',
    label: 'Firmenkunde',
    description: 'Regelmäßige Transporte für Ihr Unternehmen',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    value: 'DRIVER_SELF_EMPLOYED',
    label: 'Fahrer',
    description: 'Selbstständiger Fahrer mit eigenem Fahrzeug',
    icon: <Truck className="w-6 h-6" />,
  },
  {
    value: 'DISPATCHER',
    label: 'Disponent',
    description: 'Verwalten Sie eine Flotte von Fahrzeugen',
    icon: <Users className="w-6 h-6" />,
  },
];

export function AuthModal({ open, onOpenChange, defaultTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [selectedRole, setSelectedRole] = useState<UserRole>('SHIPPER_PRIVATE');
  const [step, setStep] = useState(1);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const { login, register: registerUser, isLoading } = useAuthStore();

  const handleLogin = async () => {
    const success = await login(loginEmail, loginPassword);
    if (success) {
      onOpenChange(false);
      resetForms();
    }
  };

  const handleRegister = async () => {
    if (registerPassword !== confirmPassword) {
      alert('Passwörter stimmen nicht überein');
      return;
    }
    
    const success = await registerUser({
      email: registerEmail,
      password: registerPassword,
      firstName,
      lastName,
      role: selectedRole,
      companyName: selectedRole === 'SHIPPER_COMPANY' || selectedRole === 'DISPATCHER' ? companyName : undefined,
      phone,
    });
    
    if (success) {
      onOpenChange(false);
      resetForms();
    }
  };

  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegisterEmail('');
    setRegisterPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setPhone('');
    setAcceptTerms(false);
    setStep(1);
    setTab('login');
  };

  const showCompanyFields = selectedRole === 'SHIPPER_COMPANY' || selectedRole === 'DISPATCHER';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'login' | 'register'); setStep(1); }}>
          <div className="bg-muted/30 p-1">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="register">Registrieren</TabsTrigger>
            </TabsList>
          </div>

          {/* Login Tab */}
          <TabsContent value="login" className="mt-0">
            <div className="p-6">
              <DialogHeader className="mb-6">
                <DialogTitle>Willkommen zurück</DialogTitle>
                <DialogDescription>
                  Melden Sie sich bei Ihrem CargoBit-Konto an
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-Mail-Adresse</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="ihre@email.de"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded border-input" />
                    Angemeldet bleiben
                  </label>
                  <Button variant="link" className="p-0 h-auto text-sm">
                    Passwort vergessen?
                  </Button>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleLogin}
                  disabled={isLoading || !loginEmail || !loginPassword}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Anmelden
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="mt-0">
            {step === 1 ? (
              <div className="p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle>Rolle auswählen</DialogTitle>
                  <DialogDescription>
                    Wählen Sie die Rolle, die am besten zu Ihnen passt
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3">
                  {roles.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50 ${
                        selectedRole === role.value ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      {selectedRole === role.value && (
                        <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                        selectedRole === role.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {role.icon}
                      </div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{role.description}</div>
                    </button>
                  ))}
                </div>

                <Button 
                  className="w-full mt-6" 
                  onClick={() => setStep(2)}
                >
                  Weiter
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <DialogHeader className="mb-6">
                  <DialogTitle>Konto erstellen</DialogTitle>
                  <DialogDescription>
                    Als {roles.find(r => r.value === selectedRole)?.label}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">Vorname</Label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="first-name"
                          placeholder="Max"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Nachname</Label>
                      <Input
                        id="last-name"
                        placeholder="Mustermann"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  {showCompanyFields && (
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Firmenname</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="company-name"
                          placeholder="Musterfirma GmbH"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-Mail-Adresse</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="ihre@email.de"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Telefonnummer</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+49 123 456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      className="rounded border-input mt-0.5" 
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                    />
                    <span className="text-muted-foreground">
                      Ich stimme den <a href="#" className="text-primary hover:underline">AGB</a> und der{' '}
                      <a href="#" className="text-primary hover:underline">Datenschutzerklärung</a> zu
                    </span>
                  </label>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Zurück
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleRegister}
                      disabled={isLoading || !acceptTerms || !firstName || !lastName || !registerEmail || !registerPassword || registerPassword !== confirmPassword}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Konto erstellen
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
