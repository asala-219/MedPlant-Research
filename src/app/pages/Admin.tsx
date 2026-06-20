import React, { useCallback, useEffect, useState } from "react";
import {
  Database,
  Lock,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Columns3,
  Search,
  Network,
} from "lucide-react";
import {
  api,
  ADMIN_TOKEN_KEY,
  type AdminTable,
  type AdminColumn,
} from "../../api/client";
import { PlantImageManager } from "../components/PlantImageManager";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

const PAGE = 25;
const SQL_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB"];

function cellValue(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function Admin() {
  const { lang } = useLang();
  const tr = t[lang];

  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [enabled, setEnabled] = useState(true);

  const [tables, setTables] = useState<AdminTable[]>([]);
  const [activeTable, setActiveTable] = useState("plants");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<AdminColumn[]>([]);
  const [pk, setPk] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [rowModal, setRowModal] = useState<"add" | "edit" | null>(null);
  const [rowForm, setRowForm] = useState<Record<string, string>>({});
  const [editPk, setEditPk] = useState<Record<string, unknown>>({});

  const [colModal, setColModal] = useState(false);
  const [colName, setColName] = useState("");
  const [colType, setColType] = useState("TEXT");
  const [colDefault, setColDefault] = useState("");

  const activeMeta = tables.find((tb) => tb.name === activeTable);

  const flash = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setMessage(""); setError(""); }, 4000);
  };

  const autoLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  }, []);

  const is401 = (e: unknown) => String(e).includes("401") || String(e).toLowerCase().includes("invalid or expired");

  const loadTables = useCallback(async (tok: string) => {
    const data = await api.adminTables(tok);
    setTables(data);
  }, []);

  const loadRows = useCallback(async (tok: string, table: string, s = 0, q = "") => {
    setLoading(true);
    try {
      const res = await api.adminRows(tok, table, { skip: s, limit: PAGE, search: q || undefined });
      setRows(res.rows);
      setColumns(res.columns);
      setTotal(res.total);
      setSkip(res.skip);
      setPk(res.pk);
    } catch (e) {
      if (is401(e)) { autoLogout(); return; }
      flash(e instanceof Error ? e.message : tr.error, true);
    } finally {
      setLoading(false);
    }
  }, [tr.error, autoLogout]);

  useEffect(() => {
    api.adminStatus().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    loadTables(token).catch((e) => {
      if (is401(e)) autoLogout();
    });
  }, [token, loadTables, autoLogout]);

  useEffect(() => {
    if (!token) return;
    loadRows(token, activeTable, skip, search);
  }, [token, activeTable, skip, search, loadRows]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const { token: tok } = await api.adminLogin(password);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, tok);
      setToken(tok);
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : tr.error);
    }
  }

  function handleLogout() {
    if (token) api.adminLogout(token).catch(() => {});
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  }

  function openAddRow() {
    const form: Record<string, string> = {};
    columns.forEach((c) => {
      if (c.name === activeMeta?.auto_pk) return;
      form[c.name] = "";
    });
    setRowForm(form);
    setEditPk({});
    setRowModal("add");
  }

  function openEditRow(row: Record<string, unknown>) {
    const form: Record<string, string> = {};
    const pkVals: Record<string, unknown> = {};
    columns.forEach((c) => {
      form[c.name] = cellValue(row[c.name]);
      if (c.pk) pkVals[c.name] = row[c.name];
    });
    setRowForm(form);
    setEditPk(pkVals);
    setRowModal("edit");
  }

  async function saveRow() {
    if (!token) return;
    const data: Record<string, unknown> = {};
    Object.entries(rowForm).forEach(([k, v]) => {
      if (activeMeta?.auto_pk && k === activeMeta.auto_pk) return;
      data[k] = v === "" ? null : v;
    });
    try {
      if (rowModal === "add") {
        await api.adminCreateRow(token, activeTable, data);
        flash(tr.admin_row_added);
      } else {
        const updates: Record<string, unknown> = {};
        Object.entries(data).forEach(([k, v]) => {
          if (!pk.includes(k)) updates[k] = v;
        });
        await api.adminUpdateRow(token, activeTable, editPk, updates);
        flash(tr.admin_row_updated);
      }
      setRowModal(null);
      await loadTables(token);
      await loadRows(token, activeTable, 0, search);
      setSkip(0);
    } catch (e) {
      flash(e instanceof Error ? e.message : tr.error, true);
    }
  }

  async function removeRow(row: Record<string, unknown>) {
    if (!token) return;
    const pkVals: Record<string, unknown> = {};
    pk.forEach((k) => { pkVals[k] = row[k]; });
    if (!window.confirm(tr.admin_confirm_delete)) return;
    try {
      await api.adminDeleteRow(token, activeTable, pkVals);
      flash(tr.admin_row_deleted);
      await loadTables(token);
      await loadRows(token, activeTable, skip, search);
    } catch (e) {
      flash(e instanceof Error ? e.message : tr.error, true);
    }
  }

  async function saveColumn() {
    if (!token || !colName.trim()) return;
    try {
      await api.adminAddColumn(token, activeTable, colName.trim(), colType, colDefault || undefined);
      flash(tr.admin_column_added);
      setColModal(false);
      setColName("");
      setColType("TEXT");
      setColDefault("");
      await loadTables(token);
      await loadRows(token, activeTable, skip, search);
    } catch (e) {
      flash(e instanceof Error ? e.message : tr.error, true);
    }
  }

  async function rebuildGraph() {
    if (!token) return;
    try {
      const res = await api.adminRebuildGraph(token);
      flash(`${res.message} (${res.nodes} nodes, ${res.edges} edges)`);
    } catch (e) {
      flash(e instanceof Error ? e.message : tr.error, true);
    }
  }

  if (!token) {
    return (
      <main className="max-w-md mx-auto px-6 py-24">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-stone-900">{tr.admin_title}</h1>
              <p className="text-sm text-stone-500">{tr.admin_login_hint}</p>
            </div>
          </div>
          {!enabled && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              {tr.admin_disabled}
            </p>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tr.admin_password}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              autoComplete="current-password"
            />
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button
              type="submit"
              disabled={!enabled}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {tr.admin_login}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-10 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-emerald-600 mb-1">Admin</h2>
          <h1 className="text-3xl font-serif font-bold text-stone-900">{tr.admin_title}</h1>
          <p className="text-stone-500 mt-1 text-sm">{tr.admin_subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={rebuildGraph}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 bg-white text-sm font-medium hover:bg-stone-50"
          >
            <Network className="w-4 h-4" />
            {tr.admin_rebuild_graph}
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
            {tr.admin_logout}
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${error ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
          {error || message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table list */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">{tr.admin_tables}</p>
            <ul className="space-y-1">
              {tables.map((tb) => (
                <li key={tb.name}>
                  <button
                    onClick={() => { setActiveTable(tb.name); setSkip(0); setSearch(""); }}
                    className={`w-full text-start px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors ${
                      activeTable === tb.name
                        ? "bg-emerald-50 text-emerald-800 font-semibold"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 shrink-0" />
                      {tb.label}
                    </span>
                    <span className="text-xs text-stone-400">{tb.row_count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Data panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-stone-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
                  placeholder={tr.admin_search_rows}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="flex gap-2">
                {activeMeta?.allow_add_column && (
                  <button
                    onClick={() => setColModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium hover:bg-stone-50"
                  >
                    <Columns3 className="w-4 h-4" />
                    {tr.admin_add_column}
                  </button>
                )}
                <button
                  onClick={openAddRow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  {tr.admin_add_row}
                </button>
                <button
                  onClick={() => token && loadRows(token, activeTable, skip, search)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-sm hover:bg-stone-50"
                  title={tr.admin_refresh}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left">
                    {columns.map((c) => (
                      <th key={c.name} className="px-4 py-2.5 font-semibold text-stone-600 whitespace-nowrap">
                        {c.name}
                        {c.pk && <span className="ms-1 text-[10px] text-emerald-600">PK</span>}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 w-24">{tr.admin_actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-stone-400">
                        {tr.loading}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-stone-400">
                        {tr.no_data}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr key={i} className="border-t border-stone-100 hover:bg-stone-50/50">
                        {columns.map((c) => (
                          <td key={c.name} className="px-4 py-2 max-w-[200px] text-stone-700">
                            {activeTable === "plants" && c.name === "image_url" && token ? (
                              <PlantImageManager
                                plantId={Number(row.id)}
                                token={token}
                                compact
                                onChanged={() => loadRows(token, activeTable, skip, search)}
                              />
                            ) : (
                              <span className="truncate block" title={cellValue(row[c.name])}>
                                {cellValue(row[c.name]) || <span className="text-stone-300">—</span>}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditRow(row)}
                              className="p-1.5 rounded-md text-stone-500 hover:bg-emerald-50 hover:text-emerald-700"
                              title={tr.admin_edit}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeRow(row)}
                              className="p-1.5 rounded-md text-stone-500 hover:bg-red-50 hover:text-red-600"
                              title={tr.admin_delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 text-sm text-stone-500">
              <span>
                {tr.showing} {total === 0 ? 0 : skip + 1}–{Math.min(skip + PAGE, total)} {tr.of} {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={skip === 0}
                  onClick={() => setSkip(Math.max(0, skip - PAGE))}
                  className="px-3 py-1 rounded-lg border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
                >
                  ←
                </button>
                <button
                  disabled={skip + PAGE >= total}
                  onClick={() => setSkip(skip + PAGE)}
                  className="px-3 py-1 rounded-lg border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row modal */}
      {rowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100">
              <h3 className="text-lg font-serif font-bold text-stone-900">
                {rowModal === "add" ? tr.admin_add_row : tr.admin_edit_row}
              </h3>
              <p className="text-sm text-stone-500 mt-1">{activeMeta?.label}</p>
            </div>
            <div className="p-6 space-y-3">
              {columns
                .filter((c) => rowModal === "add" ? !(c.pk && activeMeta?.auto_pk) : !c.pk)
                .map((c) => (
                  <label key={c.name} className="block">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      {c.name}
                      {c.notnull && <span className="text-red-500 ms-0.5">*</span>}
                    </span>
                    <input
                      value={rowForm[c.name] ?? ""}
                      onChange={(e) => setRowForm((f) => ({ ...f, [c.name]: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                ))}
              {rowModal === "edit" && pk.length > 0 && (
                <p className="text-xs text-stone-400 pt-2">
                  PK: {pk.map((k) => `${k}=${cellValue(editPk[k])}`).join(", ")}
                </p>
              )}
            </div>
            <div className="p-6 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setRowModal(null)}
                className="px-4 py-2 rounded-lg border border-stone-200 text-sm hover:bg-stone-50"
              >
                {tr.admin_cancel}
              </button>
              <button
                onClick={saveRow}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                {tr.admin_save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add column modal */}
      {colModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-stone-100">
              <h3 className="text-lg font-serif font-bold text-stone-900">{tr.admin_add_column}</h3>
            </div>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-stone-500 uppercase">{tr.admin_column_name}</span>
                <input
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  placeholder="e.g. notes"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-stone-500 uppercase">{tr.admin_column_type}</span>
                <select
                  value={colType}
                  onChange={(e) => setColType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {SQL_TYPES.map((ty) => (
                    <option key={ty} value={ty}>{ty}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-stone-500 uppercase">{tr.admin_column_default}</span>
                <input
                  value={colDefault}
                  onChange={(e) => setColDefault(e.target.value)}
                  placeholder={tr.admin_optional}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </label>
            </div>
            <div className="p-6 border-t border-stone-100 flex justify-end gap-2">
              <button onClick={() => setColModal(false)} className="px-4 py-2 rounded-lg border border-stone-200 text-sm hover:bg-stone-50">
                {tr.admin_cancel}
              </button>
              <button onClick={saveColumn} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                {tr.admin_save}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
