import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, LogOut, FileText, CheckCircle2, Clock, Building2, Search } from 'lucide-react';
import { Input } from '../components/ui/input';

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

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        fetchRequests();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRequests = () => {
    const q = query(collection(db, 'budget_requests'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: any[] = [];
      snapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() });
      });
      setRequests(reqs);
      setLoading(false);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'budget_requests');
      } catch (handledErr: any) {
        setError('Você não tem permissão para acessar os dados ou ocorreu um erro.');
        setLoading(false);
      }
    });

    return unsubscribe;
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'budget_requests', id), {
        status: currentStatus === 'pending' ? 'reviewed' : 'pending'
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `budget_requests/${id}`);
      } catch (handledErr: any) {
        alert('Erro ao atualizar status.');
      }
    }
  };

  const filteredRequests = requests.filter(req => 
    req.companyId.includes(searchTerm) || 
    req.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans">
        <Card className="w-full max-w-md text-center py-16 px-6 border-0 shadow-none">
          <CardHeader>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <Building2 size={32} className="text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-2xl mb-2 font-semibold">Acesso Restrito</CardTitle>
            <CardDescription>Faça login para acessar o painel de orçamentos da Atec Medical.</CardDescription>
          </CardHeader>
          <CardContent className="mt-6">
            <Button onClick={handleLogin} size="lg" className="w-full">
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">Painel de Orçamentos</h1>
              <p className="text-xs text-slate-500">Atec Medical</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium uppercase text-sm">
                {user.email?.charAt(0)}
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-900">{user.displayName || 'Admin'}</p>
                <p className="text-slate-500 text-xs">{user.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-full text-slate-500 hover:text-slate-900">
              <LogOut size={16} className="mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 border border-red-100 font-medium flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">!</div>
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Solicitações Recentes</h2>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar por CNPJ, nome ou descrição..." 
              className="pl-10 bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredRequests.length === 0 && !error ? (
            <div className="text-center py-20 border border-slate-100 rounded-2xl">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma solicitação encontrada</h3>
              <p className="text-sm text-slate-500">
                {searchTerm ? 'Tente buscar com outros termos.' : 'As novas solicitações de orçamento aparecerão aqui automaticamente.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <Card key={req.id} className="overflow-hidden border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                <div className="flex flex-col md:flex-row relative">
                  {/* Status Indicator Line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${req.status === 'reviewed' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  
                  <div className="p-6 flex-1 pl-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-100">
                          CNPJ: {req.companyId.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Clock size={14} />
                          {req.createdAt ? format(req.createdAt.toDate(), "dd MMM yyyy 'às' HH:mm", { locale: ptBR }) : 'Data desconhecida'}
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleStatus(req.id, req.status)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-full transition-all border ${
                          req.status === 'reviewed' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                        }`}
                      >
                        {req.status === 'reviewed' ? (
                          <><CheckCircle2 size={14} /> Revisado</>
                        ) : (
                          <><Clock size={14} /> Pendente</>
                        )}
                      </button>
                    </div>

                    <div className="grid md:grid-cols-12 gap-8">
                      <div className="md:col-span-4 space-y-4">
                        <div>
                          <h4 className="text-xs font-medium text-slate-500 mb-2">Responsável</h4>
                          <p className="font-medium text-slate-900 mb-1">{req.responsibleName}</p>
                          <div className="space-y-0.5">
                            <p className="text-sm text-slate-500">{req.responsibleEmail}</p>
                            <p className="text-sm text-slate-500">{req.responsiblePhone}</p>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-8">
                        <h4 className="text-xs font-medium text-slate-500 mb-2">Detalhes do Pedido</h4>
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {req.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
