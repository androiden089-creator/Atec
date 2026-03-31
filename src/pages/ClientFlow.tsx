import React, { useState } from 'react';
import { collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Building2, CheckCircle2, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Step = 'ENTER_CNPJ' | 'CONFIRM_COMPANY' | 'REGISTER_COMPANY' | 'BUDGET_FORM' | 'SUCCESS';

const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

const unformatCNPJ = (value: string) => value.replace(/\D/g, '');

export default function ClientFlow() {
  const [step, setStep] = useState<Step>('ENTER_CNPJ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Registration State
  const [regData, setRegData] = useState({
    name: '',
    address: '',
    cep: '',
    email: '',
    phone: ''
  });

  // Budget State
  const [budgetData, setBudgetData] = useState({
    responsibleName: '',
    responsibleEmail: '',
    responsiblePhone: '',
    description: ''
  });

  const handleCNPJSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCNPJ = unformatCNPJ(cnpj);
    
    if (cleanCNPJ.length !== 14) {
      setError('CNPJ inválido. Digite 14 números.');
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'companies', cleanCNPJ);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setCompanyName(docSnap.data().name);
        setStep('CONFIRM_COMPANY');
      } else {
        setStep('REGISTER_COMPANY');
      }
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.GET, `companies/${cleanCNPJ}`);
      } catch (handledErr: any) {
        setError(`Erro ao verificar CNPJ. Detalhes no console.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const cleanCNPJ = unformatCNPJ(cnpj);

    try {
      await setDoc(doc(db, 'companies', cleanCNPJ), {
        cnpj: cleanCNPJ,
        name: regData.name,
        address: regData.address,
        cep: regData.cep,
        email: regData.email,
        phone: regData.phone,
        createdAt: serverTimestamp()
      });
      setCompanyName(regData.name);
      setStep('BUDGET_FORM');
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `companies/${cleanCNPJ}`);
      } catch (handledErr: any) {
        setError('Erro ao cadastrar empresa.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const cleanCNPJ = unformatCNPJ(cnpj);
    const requestId = doc(collection(db, 'budget_requests')).id;

    try {
      await setDoc(doc(db, 'budget_requests', requestId), {
        companyId: cleanCNPJ,
        responsibleName: budgetData.responsibleName,
        responsibleEmail: budgetData.responsibleEmail,
        responsiblePhone: budgetData.responsiblePhone,
        description: budgetData.description,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setStep('SUCCESS');
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `budget_requests/${requestId}`);
      } catch (handledErr: any) {
        setError('Erro ao enviar solicitação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
            <Building2 size={32} strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Atec Medical</h1>
          <p className="text-slate-500 mt-2">Solicitação de Orçamento</p>
        </div>

        <div className="transition-all duration-300 ease-in-out">
          {step === 'ENTER_CNPJ' && (
            <Card className="border-0 shadow-none">
              <form onSubmit={handleCNPJSubmit}>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl">Identificação</CardTitle>
                  <CardDescription>Informe o CNPJ da sua empresa para iniciar o processo de orçamento.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                        maxLength={18}
                        required
                        className="text-lg tracking-wide"
                      />
                    </div>
                    {error && <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                  </div>
                </CardContent>
                <CardFooter className="px-0 pb-0">
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                    Continuar <ChevronRight size={20} className="ml-2" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {step === 'CONFIRM_COMPANY' && (
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl">Confirmação</CardTitle>
                <CardDescription>Encontramos um cadastro com o CNPJ informado.</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8 px-0">
                <p className="text-slate-500 mb-3">Você é a empresa</p>
                <p className="text-2xl font-semibold text-slate-900 px-4">{companyName}?</p>
              </CardContent>
              <CardFooter className="flex gap-4 px-0 pb-0">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep('ENTER_CNPJ')}>
                  Não, voltar
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setStep('BUDGET_FORM')}>
                  Sim, continuar
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'REGISTER_COMPANY' && (
            <Card className="border-0 shadow-none">
              <form onSubmit={handleRegisterSubmit}>
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setStep('ENTER_CNPJ')} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <ArrowLeft size={20} />
                    </button>
                    <CardTitle className="text-xl">Cadastro de Empresa</CardTitle>
                  </div>
                  <CardDescription>Não encontramos este CNPJ. Por favor, preencha os dados básicos da sua empresa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-0">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Razão Social / Nome Fantasia</Label>
                    <Input id="reg-name" required value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-address">Endereço Completo</Label>
                    <Input id="reg-address" required value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="reg-cep">CEP</Label>
                      <Input id="reg-cep" required value={regData.cep} onChange={e => setRegData({...regData, cep: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">Telefone</Label>
                      <Input id="reg-phone" required value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">E-mail Corporativo</Label>
                    <Input id="reg-email" type="email" required value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} />
                  </div>
                  {error && <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                </CardContent>
                <CardFooter className="px-0 pb-0">
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                    Cadastrar e Continuar
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {step === 'BUDGET_FORM' && (
            <Card className="border-0 shadow-none">
              <form onSubmit={handleBudgetSubmit}>
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setStep('ENTER_CNPJ')} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <ArrowLeft size={20} />
                    </button>
                    <CardTitle className="text-xl">Solicitação de Orçamento</CardTitle>
                  </div>
                  <CardDescription>Preencha os dados do pedido para a empresa <span className="font-medium text-slate-900">{companyName}</span>.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 px-0">
                  <div className="space-y-5">
                    <h4 className="font-medium text-sm text-slate-900">Responsável pelo Pedido</h4>
                    <div className="space-y-2">
                      <Label htmlFor="resp-name">Nome Completo</Label>
                      <Input id="resp-name" required value={budgetData.responsibleName} onChange={e => setBudgetData({...budgetData, responsibleName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="resp-email">E-mail</Label>
                        <Input id="resp-email" type="email" required value={budgetData.responsibleEmail} onChange={e => setBudgetData({...budgetData, responsibleEmail: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resp-phone">Telefone / WhatsApp</Label>
                        <Input id="resp-phone" required value={budgetData.responsiblePhone} onChange={e => setBudgetData({...budgetData, responsiblePhone: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h4 className="font-medium text-sm text-slate-900">Detalhes do Pedido</h4>
                    <div className="space-y-2">
                      <Label htmlFor="description">O que você deseja orçar?</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Ex: Locação de torre de vídeo, bisturi elétrico, etc."
                        required 
                        value={budgetData.description} 
                        onChange={e => setBudgetData({...budgetData, description: e.target.value})} 
                      />
                    </div>
                  </div>
                  {error && <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                </CardContent>
                <CardFooter className="px-0 pb-0">
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                    Enviar Solicitação
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {step === 'SUCCESS' && (
            <Card className="text-center py-16 px-0 border-0 shadow-none">
              <CardContent className="px-0">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">Tudo certo!</h2>
                <p className="text-slate-500 mb-10 max-w-sm mx-auto">
                  Sua solicitação de orçamento foi enviada com sucesso. Nossa equipe entrará em contato em breve.
                </p>
                <Button size="lg" onClick={() => {
                  setStep('ENTER_CNPJ');
                  setCnpj('');
                  setBudgetData({ responsibleName: '', responsibleEmail: '', responsiblePhone: '', description: '' });
                }}>
                  Fazer nova solicitação
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
