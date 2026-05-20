'use client';
import { useQuery } from 'react-query';
import { dashboardApi } from '@/lib/api';
import {
  Users, Megaphone, Smartphone, MessageSquare,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';

const colorMap: Record<string, string> = {
  blue:    'bg-blue-500/10 text-blue-500',
  green:   'bg-emerald-500/10 text-emerald-500',
  red:     'bg-red-500/10 text-red-500',
  orange:  'bg-orange-500/10 text-orange-500',
  purple:  'bg-violet-500/10 text-violet-500',
  yellow:  'bg-amber-500/10 text-amber-500',
  emerald: 'bg-emerald-500/10 text-emerald-500',
};

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value?: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-xl ${colorMap[color] ?? colorMap.blue}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-xs font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-none">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</h2>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="h-7 bg-slate-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery('dashboard-overview', () =>
    dashboardApi.overview().then(r => r.data),
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div>
          <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded-xl w-64 mt-2 animate-pulse" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-3 bg-slate-100 rounded w-24 mb-4 animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => <SkeletonCard key={j} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { contacts, sessions, campaigns, queue, attendance } = data || {};
  const taxaResposta = campaigns?.enviados > 0
    ? ((campaigns.respostas / campaigns.enviados) * 100).toFixed(1) + '%'
    : '0%';

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Visão geral da operação em tempo real</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Ao vivo
        </div>
      </div>

      {/* Contatos */}
      <section>
        <SectionHeader title="Contatos" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de Contatos"  value={contacts?.total?.toLocaleString('pt-BR')}        icon={Users}         color="blue"   />
          <StatCard label="Aptos para Envio"   value={contacts?.aptos?.toLocaleString('pt-BR')}        icon={CheckCircle2}  color="green"  />
          <StatCard label="Bloqueados"          value={contacts?.bloqueados?.toLocaleString('pt-BR')}   icon={Users}         color="red"    />
          <StatCard label="Blacklist"           value={contacts?.blacklisted?.toLocaleString('pt-BR')}  icon={AlertTriangle} color="orange" />
        </div>
      </section>

      {/* Campanhas */}
      <section>
        <SectionHeader title="Campanhas" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Campanhas Ativas"    value={campaigns?.ativas}                              icon={Megaphone}     color="green"   />
          <StatCard label="Mensagens Enviadas"  value={campaigns?.enviados?.toLocaleString('pt-BR')}   icon={TrendingUp}    color="blue"    />
          <StatCard label="Respostas"           value={campaigns?.respostas?.toLocaleString('pt-BR')}  icon={MessageSquare} color="purple"  sub={taxaResposta + ' de taxa'} />
          <StatCard label="Convertidos"         value={campaigns?.convertidos?.toLocaleString('pt-BR')} icon={TrendingUp}   color="emerald" />
        </div>
      </section>

      {/* Operação */}
      <section>
        <SectionHeader title="Operação" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Sessões Conectadas"     value={sessions?.conectadas}                           icon={Smartphone}    color="green"  sub={`${sessions?.total ?? 0} total`} />
          <StatCard label="Sessões Instáveis"      value={sessions?.instaveis}                            icon={AlertTriangle} color="yellow" />
          <StatCard label="Envios Hoje"            value={sessions?.enviosHoje?.toLocaleString('pt-BR')}  icon={TrendingUp}    color="blue"   />
          <StatCard label="Atendimentos Abertos"   value={attendance?.novos}                              icon={Clock}         color="purple" sub={`${attendance?.emAtendimento ?? 0} em andamento`} />
        </div>
      </section>

      {/* Fila */}
      {queue && Object.keys(queue).length > 0 && (
        <section>
          <SectionHeader title="Fila de Hoje" />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-wrap gap-8">
              {Object.entries(queue).map(([status, count]: any) => (
                <div key={status} className="text-center">
                  <p className="text-3xl font-bold text-slate-900 tabular-nums">{count}</p>
                  <p className="text-xs text-slate-400 font-medium capitalize mt-1">{status}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
