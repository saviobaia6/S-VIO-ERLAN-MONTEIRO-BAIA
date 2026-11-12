import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  Table,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Wallet,
  ArrowDownRight,
  Search,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  X,
  Check,
  Calculator,
  TrendingDown,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';

import { EXACT_SHEET_VALUES } from './data/userChallengeGrid';
import { ChallengeSheetGrid } from './components/ChallengeSheetGrid';
import { CumulativeLineChart } from './components/CumulativeLineChart';

const TOTAL_GOAL = 30000.00;
const BASE_DAILY_GOAL = TOTAL_GOAL / 365; // R$ 82.1917...

// Month allocation following the calendar days (Jan 31, Feb 28, etc.)
const MONTHS_DISTRIBUTION = [
  { name: 'Janeiro', num: 1, days: 31, quarter: '1º Trimestre' },
  { name: 'Fevereiro', num: 2, days: 28, quarter: '1º Trimestre' },
  { name: 'Março', num: 3, days: 31, quarter: '1º Trimestre' },
  { name: 'Abril', num: 4, days: 30, quarter: '2º Trimestre' },
  { name: 'Maio', num: 5, days: 31, quarter: '2º Trimestre' },
  { name: 'Junho', num: 6, days: 30, quarter: '2º Trimestre' },
  { name: 'Julho', num: 7, days: 31, quarter: '3º Trimestre' },
  { name: 'Agosto', num: 8, days: 31, quarter: '3º Trimestre' },
  { name: 'Setembro', num: 9, days: 30, quarter: '3º Trimestre' },
  { name: 'Outubro', num: 10, days: 31, quarter: '4º Trimestre' },
  { name: 'Novembro', num: 11, days: 30, quarter: '4º Trimestre' },
  { name: 'Dezembro', num: 12, days: 31, quarter: '4º Trimestre' },
];

interface ChallengeItem {
  numero: number;
  mes: string;
  mesNum: number;
  trimestre: string;
  valor: number;
  status: 'Concluído' | 'Pendente';
  data: string;
  observacoes: string;
}

// Generate the 365 challenge list using the EXACT values from the user's PDF sheet
function buildInitialItems(): ChallengeItem[] {
  const items: ChallengeItem[] = [];
  let currentNum = 1;

  for (const m of MONTHS_DISTRIBUTION) {
    for (let d = 1; d <= m.days; d++) {
      const idx = currentNum - 1;
      const val = EXACT_SHEET_VALUES[idx] || 0;
      // Default sample progress: first 60 days paid to show live charts
      const isPaid = currentNum <= 60;
      const dateStr = isPaid
        ? `2026-${String(m.num).padStart(2, '0')}-${String(Math.min(d, 28)).padStart(2, '0')}`
        : '';

      let note = '';
      if (val === 500) note = 'Depósito Máximo (Dourado)';
      else if (val === 1) note = 'Depósito Mínimo (Verde)';
      else if (currentNum === 1) note = 'Início do Desafio 365';

      items.push({
        numero: currentNum,
        mes: m.name,
        mesNum: m.num,
        trimestre: m.quarter,
        valor: val,
        status: isPaid ? 'Concluído' : 'Pendente',
        data: dateStr,
        observacoes: note,
      });

      currentNum++;
    }
  }

  return items;
}

export default function App() {
  const [items, setItems] = useState<ChallengeItem[]>(() => {
    try {
      const saved = localStorage.getItem('user_365_deposits_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 365) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return buildInitialItems();
  });

  const [activeTab, setActiveTab] = useState<'grid' | 'dashboard' | 'table' | 'guide'>('grid');
  const [filterMonth, setFilterMonth] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterQuarter, setFilterQuarter] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Set of paid numbers for lightning-fast lookup
  const paidSet = useMemo(() => {
    const s = new Set<number>();
    items.forEach((it) => {
      if (it.status === 'Concluído') s.add(it.numero);
    });
    return s;
  }, [items]);

  // Save changes to localStorage
  const updateAndSave = (nextItems: ChallengeItem[]) => {
    setItems(nextItems);
    try {
      localStorage.setItem('user_365_deposits_data', JSON.stringify(nextItems));
    } catch (e) {
      console.error(e);
    }
  };

  const [clickNotice, setClickNotice] = useState<string | null>(null);

  // Toggle single deposit status with 1 click
  const handleToggle = (num: number) => {
    let toggledVal = 0;
    let isNowPaid = false;

    const next: ChallengeItem[] = items.map((it) => {
      if (it.numero === num) {
        const nextStatus: 'Concluído' | 'Pendente' = it.status === 'Concluído' ? 'Pendente' : 'Concluído';
        isNowPaid = nextStatus === 'Concluído';
        toggledVal = it.valor;
        return {
          ...it,
          status: nextStatus,
          data: nextStatus === 'Concluído' ? (it.data || new Date().toISOString().split('T')[0]) : '',
        };
      }
      return it;
    });

    updateAndSave(next);

    const formattedNum = String(num).padStart(3, '0');
    if (isNowPaid) {
      setClickNotice(`Quadrinho #${formattedNum} (${formatBRL(toggledVal)}) computado como PAGO!`);
    } else {
      setClickNotice(`Quadrinho #${formattedNum} (${formatBRL(toggledVal)}) desmarcado (Pendente).`);
    }
    setTimeout(() => setClickNotice(null), 3000);
  };

  const handleClearAll = () => {
    if (window.confirm('Deseja desmarcar todos os depósitos pagos?')) {
      const reset = items.map((it) => ({ ...it, status: 'Pendente' as const, data: '' }));
      updateAndSave(reset);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Restaurar para a distribuição original da sua folha?')) {
      const fresh = buildInitialItems();
      updateAndSave(fresh);
    }
  };

  // Filtered deposits
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterMonth !== 'Todos' && item.mes !== filterMonth) return false;
      if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;
      if (filterQuarter !== 'Todos' && item.trimestre !== filterQuarter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = item.numero.toString().includes(q);
        const matchVal = item.valor.toString().includes(q);
        const matchMonth = item.mes.toLowerCase().includes(q);
        const matchNote = item.observacoes.toLowerCase().includes(q);
        if (!matchNum && !matchVal && !matchMonth && !matchNote) return false;
      }
      return true;
    });
  }, [items, filterMonth, filterStatus, filterQuarter, searchQuery]);

  // Overall Scorecards & Metrics
  const totalSaved = useMemo(
    () => items.filter((d) => d.status === 'Concluído').reduce((acc, c) => acc + c.valor, 0),
    [items]
  );
  const remainingBalance = Math.max(0, TOTAL_GOAL - totalSaved);
  const progressPercent = (totalSaved / TOTAL_GOAL) * 100;
  const completedCount = useMemo(
    () => items.filter((d) => d.status === 'Concluído').length,
    [items]
  );
  const pendingCount = items.length - completedCount;
  const pendingValue = Math.max(0, TOTAL_GOAL - totalSaved);

  // NEW METRIC: Required daily average based on actual contributions made
  const remainingDays = pendingCount;
  const requiredDailyAverage = remainingDays > 0 ? remainingBalance / remainingDays : 0;
  const avgPaidSoFar = completedCount > 0 ? totalSaved / completedCount : 0;
  const dailyDiff = requiredDailyAverage - BASE_DAILY_GOAL;
  const dailyDiffPct = BASE_DAILY_GOAL > 0 ? (dailyDiff / BASE_DAILY_GOAL) * 100 : 0;

  // Monthly breakdown for charts and table
  const monthlyData = useMemo(() => {
    return MONTHS_DISTRIBUTION.map((m) => {
      const monthRows = items.filter((d) => d.mesNum === m.num);
      const doneRows = monthRows.filter((d) => d.status === 'Concluído');
      const expected = monthRows.reduce((acc, c) => acc + c.valor, 0);
      const saved = doneRows.reduce((acc, c) => acc + c.valor, 0);
      const balance = Math.max(0, expected - saved);
      const pct = expected > 0 ? (saved / expected) * 100 : 0;

      return {
        mes: m.name,
        mesNum: m.num,
        trimestre: m.quarter,
        totalDias: monthRows.length,
        diasConcluidos: doneRows.length,
        metaEsperada: expected,
        valorGuardado: saved,
        saldoRestante: balance,
        percentual: pct,
      };
    });
  }, [items]);

  const maxMonthlyVal = useMemo(
    () => Math.max(...monthlyData.map((d) => Math.max(d.metaEsperada, d.valorGuardado, 1))),
    [monthlyData]
  );
  const yAxisCeil = Math.ceil(maxMonthlyVal / 500) * 500;

  // CSV Export matching Google Sheets
  const downloadCSV = () => {
    const headers = 'Nº,Mês de Referência,Trimestre,Valor do Depósito,Status,Data do Depósito,Observações';
    const rows = items.map(
      (d) =>
        `${d.numero},"${d.mes}","${d.trimestre}",${d.valor.toFixed(2).replace('.', ',')},"${d.status}","${d.data}","${d.observacoes}"`
    );
    const csv = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Desafio_365_Depositos_GoogleSheets.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboardFormula = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormula(id);
    setTimeout(() => setCopiedFormula(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      {/* 1. LOOKER STUDIO APPLICATION HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
              365
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  Desafio dos 365 Depósitos
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">|</span>
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                  Meta R$ 30.000,00 (Painel & Grade Oficial)
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>Base: Folha Oficial 365 Quadrinhos</span>
                <span>·</span>
                <span className="text-emerald-400 font-medium">Sincronizado</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Baixar planilha formatada para Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Baixar .CSV</span>
            </button>
            <button
              onClick={handleResetToDefault}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Restaurar dados iniciais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-slate-800/80 pt-1.5 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'grid'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Minha Grade de 365 Quadrinhos (1 Clique)</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard Executivo (Looker Studio)</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'table'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Planilha Detalhada (365 Linhas)</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'guide'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fórmulas & Passo a Passo Looker Studio</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTAINER - FULLY ADAPTIVE MOBILE & PC */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-5 space-y-4 relative w-full">
        {clickNotice && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xl border border-slate-700 flex items-center gap-2 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{clickNotice}</span>
          </div>
        )}

        {/* VIEW 1: A GRADE ORIGINAL DE 365 QUADRINHOS COM 1 CLIQUE */}
        {activeTab === 'grid' && (
          <ChallengeSheetGrid
            paidSet={paidSet}
            onToggleSquare={handleToggle}
            onClearAll={handleClearAll}
            formatBRL={formatBRL}
          />
        )}

        {/* VIEW 2: DASHBOARD EXECUTIVO */}
        {activeTab === 'dashboard' && (
          <>
            {/* LOOKER STUDIO FILTER CONTROL BAR */}
            <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
                  <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                    <Filter className="w-3.5 h-3.5" />
                  </div>
                  <span>Controles de Filtro Interativos:</span>
                  <span className="text-slate-400 font-normal hidden sm:inline">|</span>
                  <span className="text-slate-500 font-normal hidden sm:inline">
                    {filteredItems.length} de {items.length} depósitos visíveis
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs flex-1 justify-end">
                  {/* Dropdown Mês */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    <label className="text-slate-500 font-medium">Mês:</label>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="Todos">Todos os Meses</option>
                      {MONTHS_DISTRIBUTION.map((m) => (
                        <option key={m.num} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown Status */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    <label className="text-slate-500 font-medium">Status:</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>

                  {/* Dropdown Trimestre */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    <label className="text-slate-500 font-medium">Trimestre:</label>
                    <select
                      value={filterQuarter}
                      onChange={(e) => setFilterQuarter(e.target.value)}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="Todos">Todos</option>
                      <option value="1º Trimestre">1º Trimestre</option>
                      <option value="2º Trimestre">2º Trimestre</option>
                      <option value="3º Trimestre">3º Trimestre</option>
                      <option value="4º Trimestre">4º Trimestre</option>
                    </select>
                  </div>

                  {/* Reset Filters */}
                  {(filterMonth !== 'Todos' || filterStatus !== 'Todos' || filterQuarter !== 'Todos') && (
                    <button
                      onClick={() => {
                        setFilterMonth('Todos');
                        setFilterStatus('Todos');
                        setFilterQuarter('Todos');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Limpar Filtros"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* 6 EXECUTIVE SCORECARDS (INCORPORANDO A MÉDIA DIÁRIA NECESSÁRIA E VARIAÇÃO) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Card 1: Meta Total */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Meta Total</span>
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-lg md:text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                  {formatBRL(TOTAL_GOAL)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Alvo 365 Dias</span>
                  <span className="font-mono font-medium">R$ 82,19/dia base</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-full rounded-full" />
                </div>
              </div>

              {/* Card 2: Valor Total Guardado */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs hover:border-emerald-300 transition-colors bg-gradient-to-br from-emerald-50/40 to-white">
                <div className="flex items-center justify-between text-emerald-800 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Valor Guardado</span>
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-lg md:text-xl font-bold font-mono tracking-tight text-emerald-600 tabular-nums">
                  {formatBRL(totalSaved)}
                </div>
                <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
                  <span>Status: Concluído</span>
                  <span className="font-mono font-bold">{progressPercent.toFixed(1).replace('.', ',')}%</span>
                </div>
                <div className="mt-2 w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Saldo Restante */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Saldo Restante</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="text-lg md:text-xl font-bold font-mono tracking-tight text-slate-800 tabular-nums">
                  {formatBRL(remainingBalance)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Falta para Meta</span>
                  <span className="font-mono font-medium">
                    {remainingBalance <= 0 ? 'Concluído!' : `${(100 - progressPercent).toFixed(1).replace('.', ',')}% a pagar`}
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, 100 - progressPercent)}%` }}
                  />
                </div>
              </div>

              {/* Card 4: NOVO SCORECARD SOLICITADO: Média Diária Necessária & Variação */}
              <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors bg-gradient-to-br from-blue-50/40 to-white relative">
                <div className="flex items-center justify-between text-blue-800 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Média Diária Futura</span>
                  <Calculator className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-lg md:text-xl font-bold font-mono tracking-tight text-blue-700 tabular-nums">
                  {formatBRL(requiredDailyAverage)}
                  <span className="text-[10px] text-slate-400 font-normal ml-0.5">/dia</span>
                </div>
                <div className="text-[10px] mt-1 flex items-center justify-between">
                  {remainingDays === 0 ? (
                    <span className="text-emerald-700 font-semibold">Meta Alcançada!</span>
                  ) : dailyDiff <= 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold font-mono">
                      <TrendingDown className="w-3 h-3 text-emerald-600" />
                      <span>{formatBRL(Math.abs(dailyDiff))}</span>
                      <span className="text-[9px] text-emerald-600 font-normal">(-{Math.abs(dailyDiffPct).toFixed(1)}%)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold font-mono">
                      <TrendingUp className="w-3 h-3 text-amber-600" />
                      <span>+{formatBRL(dailyDiff)}</span>
                      <span className="text-[9px] text-amber-600 font-normal">(+{dailyDiffPct.toFixed(1)}%)</span>
                    </span>
                  )}
                  <span className="text-slate-400 text-[9px]">{remainingDays} dias restantes</span>
                </div>
                <div className="mt-2 text-[9px] text-slate-500 truncate" title={`Média real dos depósitos pagos: ${formatBRL(avgPaidSoFar)}`}>
                  Média paga: <strong className="font-mono text-slate-700">{formatBRL(avgPaidSoFar)}</strong>
                </div>
              </div>

              {/* Card 5: Progresso (%) */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Progresso Geral</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-lg md:text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                  {progressPercent.toFixed(1).replace('.', ',')}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{completedCount} de 365</span>
                  <span className="font-mono font-medium text-emerald-700">Ativo</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
              </div>

              {/* Card 6: Depósitos Pagos */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Depósitos Pagos</span>
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-lg md:text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums flex items-baseline gap-1">
                  <span>{completedCount}</span>
                  <span className="text-xs text-slate-400 font-normal">/ 365</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{pendingCount} pendentes</span>
                  <span className="font-mono font-medium text-blue-600">
                    {Math.round((completedCount / 365) * 100)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / 365) * 100}%` }}
                  />
                </div>
              </div>
            </section>

            {/* GRÁFICO DE LINHA: ACÚMULO FINANCEIRO DIÁRIO AO LONGO DO TEMPO (META R$ 30.000) */}
            <section>
              <CumulativeLineChart items={items} formatBRL={formatBRL} />
            </section>

            {/* CHARTS ROW (COMPARATIVE BAR CHART + DONUT CHART) */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Comparative Column Chart (8 Columns) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>Comparativo Mensal: Meta do Mês vs. Valor Guardado</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Eixo X: Meses em ordem cronológica (1 a 12) · Baseado na sua folha de 365 depósitos
                    </p>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-400"></span>
                      <span className="text-slate-600">Meta Esperada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                      <span className="text-slate-800 font-medium">Valor Guardado (Pago)</span>
                    </div>
                  </div>
                </div>

                {/* SVG/CSS Chart Columns */}
                <div className="pt-2">
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 h-56 items-end border-b border-slate-200 pb-1">
                    {monthlyData.map((m) => {
                      const metaH = (m.metaEsperada / yAxisCeil) * 100;
                      const doneH = (m.valorGuardado / yAxisCeil) * 100;
                      const isSel = filterMonth === m.mes;
                      const isDone = m.percentual >= 100;

                      return (
                        <div
                          key={m.mes}
                          onClick={() => setFilterMonth(filterMonth === m.mes ? 'Todos' : m.mes)}
                          className={`flex flex-col items-center justify-end h-full cursor-pointer group relative rounded-t-sm transition-all ${
                            isSel ? 'bg-blue-50 ring-2 ring-blue-500/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Indicator if 100% completed */}
                          {isDone && (
                            <div className="absolute -top-3 text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100" />
                            </div>
                          )}

                          {/* Dual Columns */}
                          <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 px-0.5 h-full">
                            <div
                              className="w-1/2 bg-slate-400 group-hover:bg-slate-500 rounded-t-xs transition-all duration-300"
                              style={{ height: `${Math.max(3, metaH)}%` }}
                              title={`Meta: ${formatBRL(m.metaEsperada)}`}
                            />
                            <div
                              className="w-1/2 bg-emerald-500 group-hover:bg-emerald-600 rounded-t-xs transition-all duration-300"
                              style={{ height: `${Math.max(3, doneH)}%` }}
                              title={`Guardado: ${formatBRL(m.valorGuardado)} (${m.percentual.toFixed(1)}%)`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X Axis Month Labels */}
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 pt-2">
                    {monthlyData.map((m) => (
                      <div
                        key={m.mes}
                        onClick={() => setFilterMonth(filterMonth === m.mes ? 'Todos' : m.mes)}
                        className={`text-center cursor-pointer transition-colors ${
                          filterMonth === m.mes ? 'font-bold text-blue-600' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="text-[10px] sm:text-xs block truncate">{m.mes.slice(0, 3)}</span>
                        <span className="text-[9px] font-mono text-slate-400 hidden sm:block">
                          {m.percentual.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Donut Progress Chart (4 Columns) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <PieChart className="w-4 h-4 text-emerald-600" />
                    <span>Contagem de Depósitos (Donut)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proporção: Concluídos vs. Pendentes
                  </p>
                </div>

                {/* SVG Donut */}
                <div className="my-3 flex items-center justify-center relative">
                  {(() => {
                    const r = 56;
                    const circ = 2 * Math.PI * r;
                    const doneStroke = (completedCount / 365) * circ;
                    const pendStroke = circ - doneStroke;

                    return (
                      <div className="relative">
                        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
                          {/* Pending gray background arc */}
                          <circle
                            cx="70"
                            cy="70"
                            r={r}
                            fill="transparent"
                            stroke="#E2E8F0"
                            strokeWidth="18"
                          />
                          <circle
                            cx="70"
                            cy="70"
                            r={r}
                            fill="transparent"
                            stroke="#94A3B8"
                            strokeWidth="18"
                            strokeDasharray={`${pendStroke} ${circ}`}
                            strokeDashoffset={-doneStroke}
                            className="cursor-pointer hover:opacity-80 transition-all"
                            onClick={() => setFilterStatus(filterStatus === 'Pendente' ? 'Todos' : 'Pendente')}
                          />
                          {/* Completed green arc */}
                          <circle
                            cx="70"
                            cy="70"
                            r={r}
                            fill="transparent"
                            stroke="#10B981"
                            strokeWidth="18"
                            strokeDasharray={`${doneStroke} ${circ}`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            className="cursor-pointer hover:opacity-80 transition-all"
                            onClick={() => setFilterStatus(filterStatus === 'Concluído' ? 'Todos' : 'Concluído')}
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                            {progressPercent.toFixed(1).replace('.', ',')}%
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {completedCount} de 365
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Legend buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setFilterStatus(filterStatus === 'Concluído' ? 'Todos' : 'Concluído')}
                    className={`p-2 rounded-lg text-left transition-colors border ${
                      filterStatus === 'Concluído' ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Concluído</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                      {completedCount} dias
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700">
                      {formatBRL(totalSaved)}
                    </div>
                  </button>

                  <button
                    onClick={() => setFilterStatus(filterStatus === 'Pendente' ? 'Todos' : 'Pendente')}
                    className={`p-2 rounded-lg text-left transition-colors border ${
                      filterStatus === 'Pendente' ? 'bg-slate-200 border-slate-400' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span>Pendente</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                      {pendingCount} dias
                    </div>
                    <div className="text-[10px] font-mono text-slate-600">
                      {formatBRL(pendingValue)}
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* MONTHLY BREAKDOWN TABLE */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-blue-600" />
                  <span>Tabela de Detalhamento Mensal</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Métricas calculadas por Mês de Referência (12 Meses)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Mês</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Trimestre</th>
                      <th className="py-2.5 px-3 text-center">Nº Depósitos</th>
                      <th className="py-2.5 px-3 text-right">Meta Esperada</th>
                      <th className="py-2.5 px-3 text-right">Valor Guardado</th>
                      <th className="py-2.5 px-3 text-right">Saldo do Mês</th>
                      <th className="py-2.5 px-3 w-40">% Atingimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {monthlyData.map((m) => {
                      const isSel = filterMonth === m.mes;
                      const isDone = m.percentual >= 100;

                      return (
                        <tr
                          key={m.mes}
                          onClick={() => setFilterMonth(filterMonth === m.mes ? 'Todos' : m.mes)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSel ? 'bg-blue-50/70 font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                            {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{m.mes}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">{m.trimestre}</td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-700">
                            <span className="text-emerald-700 font-semibold">{m.diasConcluidos}</span> / {m.totalDias}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                            {formatBRL(m.metaEsperada)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                            {formatBRL(m.valorGuardado)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatBRL(m.saldoRestante)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex-1">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isDone ? 'bg-emerald-600' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, m.percentual)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-semibold text-slate-800 w-11 text-right tabular-nums">
                                {m.percentual.toFixed(1).replace('.', ',')}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals Footer */}
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <td className="py-2.5 px-3">Total Consolidado</td>
                      <td className="py-2.5 px-3 hidden sm:table-cell text-slate-500">4 Trimestres</td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                        <span className="text-emerald-700">{completedCount}</span> / 365
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatBRL(TOTAL_GOAL)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                        {formatBRL(totalSaved)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatBRL(remainingBalance)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex-1">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, progressPercent)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-900 w-11 text-right tabular-nums">
                            {progressPercent.toFixed(1).replace('.', ',')}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        )}

        {/* VIEW 3: TABELA DETALHADA DOS 365 DEPÓSITOS */}
        {activeTab === 'table' && (
          <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Planilha dos 365 Depósitos (Valores Exatos da Folha)
                </h2>
                <p className="text-xs text-slate-500">
                  Soma exatamente R$ 30.000,00 distribuídos entre os 4 trimestres conforme sua folha impressa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadCSV}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar CSV da Folha</span>
                </button>
              </div>
            </div>

            {/* Search inside table */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2.5 py-1 w-64">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar Nº (ex: 260), mês ou nota..."
                  className="w-full text-xs focus:outline-none text-slate-800"
                />
              </div>

              <div className="text-slate-500 text-[11px]">
                Exibindo {filteredItems.length} de {items.length} linhas
              </div>
            </div>

            {/* Table view */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">Status</th>
                    <th className="py-2 px-3 w-16 text-center">Nº</th>
                    <th className="py-2 px-3">Mês de Referência</th>
                    <th className="py-2 px-3 hidden md:table-cell">Trimestre</th>
                    <th className="py-2 px-3 text-right">Valor do Depósito</th>
                    <th className="py-2 px-3">Data do Depósito</th>
                    <th className="py-2 px-3">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredItems.map((item) => {
                    const isDone = item.status === 'Concluído';

                    return (
                      <tr
                        key={item.numero}
                        className={`hover:bg-slate-50 transition-colors ${
                          isDone ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggle(item.numero)}
                            className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-slate-600">
                          #{String(item.numero).padStart(3, '0')}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">{item.mes}</td>
                        <td className="py-2 px-3 text-slate-500 hidden md:table-cell">{item.trimestre}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatBRL(item.valor)}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {item.data || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {item.observacoes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* VIEW 4: FÓRMULAS & GUIA LOOKER STUDIO */}
        {activeTab === 'guide' && (
          <section className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Campos Calculados para Copiar e Colar no Looker Studio</span>
              </h2>
              <p className="text-xs text-slate-600">
                No painel direito do Looker Studio, clique em <strong>+ Adicionar campo</strong> e cole as fórmulas exatas abaixo:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {/* Formula 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">1. Valor Total Guardado</span>
                    <button
                      onClick={() =>
                        copyToClipboardFormula(
                          'CASE WHEN Status = "Concluído" THEN Valor do Depósito ELSE 0 END',
                          'f1'
                        )
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedFormula === 'f1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                      <span>{copiedFormula === 'f1' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-2.5 rounded overflow-x-auto">
                    CASE WHEN Status = "Concluído" THEN Valor do Depósito ELSE 0 END
                  </pre>
                  <p className="text-[11px] text-slate-500">Agregação: SOMA (SUM). Tipo: Numérico &gt; Moeda BRL.</p>
                </div>

                {/* Formula 2: Nova Fórmula de Média Necessária por Dia */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">2. Média Diária Necessária (Novo Scorecard)</span>
                    <button
                      onClick={() =>
                        copyToClipboardFormula(
                          '(30000 - SUM(CASE WHEN Status = "Concluído" THEN Valor do Depósito ELSE 0 END)) / NULLIF(365 - COUNT(CASE WHEN Status = "Concluído" THEN Nº ELSE NULL END), 0)',
                          'f_avg'
                        )
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedFormula === 'f_avg' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                      <span>{copiedFormula === 'f_avg' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-blue-300 font-mono text-[10px] p-2.5 rounded overflow-x-auto leading-relaxed">
                    (30000 - SUM(CASE WHEN Status = "Concluído" THEN Valor do Depósito ELSE 0 END)) / NULLIF(365 - COUNT(CASE WHEN Status = "Concluído" THEN Nº ELSE NULL END), 0)
                  </pre>
                  <p className="text-[11px] text-slate-500">Calcula quanto você precisa guardar por dia restante até completar os R$ 30.000,00.</p>
                </div>

                {/* Formula 3 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">3. Saldo Restante</span>
                    <button
                      onClick={() =>
                        copyToClipboardFormula(
                          '30000 - SUM(CASE WHEN Status = "Concluído" THEN Valor do Depósito ELSE 0 END)',
                          'f2'
                        )
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedFormula === 'f2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                      <span>{copiedFormula === 'f2' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-blue-300 font-mono text-[11px] p-2.5 rounded overflow-x-auto">
                    30000 - SUM(CASE WHEN Status = "Concluído" THEN Valor do Depósito ELSE 0 END)
                  </pre>
                  <p className="text-[11px] text-slate-500">Subtrai o valor guardado da meta de R$ 30.000,00.</p>
                </div>

                {/* Formula 4 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">4. Mês Ordem (Ordenação Cronológica)</span>
                    <button
                      onClick={() =>
                        copyToClipboardFormula(
                          'CASE Mês de Referência WHEN "Janeiro" THEN 1 WHEN "Fevereiro" THEN 2 WHEN "Março" THEN 3 WHEN "Abril" THEN 4 WHEN "Maio" THEN 5 WHEN "Junho" THEN 6 WHEN "Julho" THEN 7 WHEN "Agosto" THEN 8 WHEN "Setembro" THEN 9 WHEN "Outubro" THEN 10 WHEN "Novembro" THEN 11 WHEN "Dezembro" THEN 12 ELSE 13 END',
                          'f4'
                        )
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedFormula === 'f4' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                      <span>{copiedFormula === 'f4' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-amber-300 font-mono text-[10px] p-2 rounded overflow-x-auto">
                    CASE Mês de Referência WHEN "Janeiro" THEN 1 ... ELSE 13 END
                  </pre>
                  <p className="text-[11px] text-slate-500">Use no parâmetro "Classificar por" para manter Jan-Dez na ordem correta.</p>
                </div>
              </div>
            </div>

            {/* Step by step connection */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Como conectar a sua planilha ao Google Looker Studio:
              </h3>
              <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Abra o <strong>Google Looker Studio</strong> (lookerstudio.google.com) e crie um novo Relatório em branco.</li>
                <li>Na janela de conectores, selecione <strong>Google Planilhas</strong> e escolha a sua planilha do desafio.</li>
                <li>Marque <em>"Usar a primeira linha como cabeçalho"</em> e confirme a adição da fonte de dados.</li>
                <li>Adicione os 6 Scorecards no topo do relatório apontando para as métricas calculadas.</li>
                <li>Insira o Gráfico de Colunas Comparativo e ordene pelo campo <code>Mês Ordem</code> crescente.</li>
                <li>Adicione os Controles de Lista Suspensa para <code>Mês de Referência</code> e <code>Status</code>.</li>
                <li><strong>Gráfico de Linha do Acúmulo:</strong> Insira um <em>Gráfico de séries temporais</em>, defina a métrica como <code>Valor Guardado</code> com <em>Cálculo de execução = Soma Acumulada</em> e adicione uma Linha de Referência fixa em <code>30000</code>.</li>
              </ol>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
