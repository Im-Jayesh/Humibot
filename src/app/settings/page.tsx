"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Heart,
  Plus,
  Sparkles,
  Trash2,
  User,
  Info,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  defaultPersonaConfig,
  defaultSchedule,
  type PersonaConfig,
  type ScheduleBlock,
  type StyleSample,
} from "@/lib/types/persona";

export default function SettingsPage() {
  const [config, setConfig] = useState<PersonaConfig>(defaultPersonaConfig);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(defaultSchedule);
  const [styleSamples, setStyleSamples] = useState<StyleSample[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "mimic" | "custom" | "schedule">("profile");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Style Sample adding states
  const [sampleLabel, setSampleLabel] = useState("");
  const [sampleContent, setSampleContent] = useState("");

  // Tones adding state
  const [newTone, setNewTone] = useState("");

  // Local state for comma separated inputs to prevent controlled input bugs
  const [interestsText, setInterestsText] = useState("");
  const [goalsText, setGoalsText] = useState("");

  // Initiative testing states
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testingInitiative, setTestingInitiative] = useState(false);
  const [initiativeLogs, setInitiativeLogs] = useState<any[]>([]);
  const [forceSend, setForceSend] = useState(false);

  const loadPersona = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/persona", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load persona");
      const data = await res.json();
      setConfig(data.config);
      setSchedule(data.runtime.schedule ?? defaultSchedule);
      setStyleSamples(data.styleSamples ?? []);
      setInterestsText(data.config.interests.join(", "));
      setGoalsText(data.config.goals.join(", "));
    } catch {
      setError("Failed to load persona settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInitiativeLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/persona/initiative-logs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setInitiativeLogs(data.logs ?? []);
      }
    } catch (error) {
      console.error("Failed to load logs", error);
    }
  }, []);

  useEffect(() => {
    void loadPersona();
    void loadInitiativeLogs();
  }, [loadPersona, loadInitiativeLogs]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const parsedInterests = interestsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedGoals = goalsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedConfig = {
      ...config,
      interests: parsedInterests,
      goals: parsedGoals,
    };

    const res = await fetch("/api/persona", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ config: updatedConfig, schedule, styleSamples }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Save failed. Check your connection.");
      return;
    }

    const data = await res.json();
    setConfig(data.config);
    setSchedule(data.runtime.schedule ?? schedule);
    setStyleSamples(data.styleSamples ?? styleSamples);
    setInterestsText(data.config.interests.join(", "));
    setGoalsText(data.config.goals.join(", "));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Tones helper functions
  function addTone() {
    const trimmed = newTone.trim();
    if (trimmed && !config.tones.includes(trimmed)) {
      setConfig({ ...config, tones: [...config.tones, trimmed] });
      setNewTone("");
    }
  }

  function removeTone(toneToRemove: string) {
    setConfig({ ...config, tones: config.tones.filter((t) => t !== toneToRemove) });
  }

  // Custom Fields helper functions
  function addCustomField() {
    setConfig((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, "": "" },
    }));
  }

  function updateCustomFieldKey(oldKey: string, newKey: string) {
    setConfig((prev) => {
      const updated = { ...prev.customFields };
      const value = updated[oldKey];
      delete updated[oldKey];
      updated[newKey] = value;
      return { ...prev, customFields: updated };
    });
  }

  function updateCustomFieldValue(key: string, value: string) {
    setConfig((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [key]: value },
    }));
  }

  function deleteCustomField(key: string) {
    setConfig((prev) => {
      const updated = { ...prev.customFields };
      delete updated[key];
      return { ...prev, customFields: updated };
    });
  }

  // Style Samples helper functions
  function addStyleSample() {
    if (!sampleLabel.trim() || !sampleContent.trim()) return;
    const newSample: StyleSample = {
      label: sampleLabel.trim(),
      content: sampleContent.trim(),
      role: "loved_one",
    };
    setStyleSamples((prev) => [...prev, newSample]);
    setSampleLabel("");
    setSampleContent("");
  }

  function deleteStyleSample(index: number) {
    setStyleSamples((prev) => prev.filter((_, i) => i !== index));
  }

  // Initiative testing function
  async function runInitiativeTest() {
    setTestingInitiative(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/persona/test-initiative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceSend }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        await loadInitiativeLogs();
      } else {
        setError("Initiative test failed.");
      }
    } catch {
      setError("Initiative test failed.");
    } finally {
      setTestingInitiative(false);
    }
  }

  function updateBlock(id: string, patch: Partial<ScheduleBlock>) {
    setSchedule((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
  }

  return (
    <div className="flex h-[100dvh] w-full justify-center bg-zinc-100 dark:bg-zinc-900">
      <div className="flex h-full w-full min-w-0 flex-col bg-white dark:bg-zinc-950 sm:max-w-lg md:max-w-xl">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-3 sm:px-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
              Customize Humibot
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving || loading}
              className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </header>

        {/* Tab Selection */}
        <div className="flex shrink-0 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-2">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "mimic", label: "Mimic Style", icon: Heart },
            { id: "custom", label: "Traits & Tones", icon: Sparkles },
            { id: "schedule", label: "Schedule & Test", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] sm:text-xs font-medium border-b-2 transition-all ${
                  active
                    ? "border-sky-500 text-sky-500"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? "text-sky-500" : "text-zinc-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-sky-500" />
              <p className="mt-3 text-sm font-medium">Loading settings...</p>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {error ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              {saved ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Changes saved successfully!
                </p>
              ) : null}

              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <User className="h-4 w-4 text-sky-500" /> Core Identity
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Name">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          value={config.name}
                          onChange={(e) => setConfig({ ...config, name: e.target.value })}
                        />
                      </Field>

                      <Field label="Gender">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          value={config.gender}
                          onChange={(e) => setConfig({ ...config, gender: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Location">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          placeholder="e.g. San Francisco, CA"
                          value={config.location}
                          onChange={(e) => setConfig({ ...config, location: e.target.value })}
                        />
                      </Field>

                      <Field label="Profession">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          placeholder="e.g. Software Engineer"
                          value={config.profession}
                          onChange={(e) => setConfig({ ...config, profession: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Relationship Style">
                        <select
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          value={config.relationship}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              relationship: e.target.value as PersonaConfig["relationship"],
                            })
                          }
                        >
                          {["friend", "crush", "partner", "sibling", "mentor", "rival"].map(
                            (value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            )
                          )}
                        </select>
                      </Field>

                      <Field label="Talking Style">
                        <select
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          value={config.talkingStyle}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              talkingStyle: e.target.value as PersonaConfig["talkingStyle"],
                            })
                          }
                        >
                          {["friendly", "serious", "sarcastic", "soft"].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <Sparkles className="h-4 w-4 text-sky-500" /> Personality Sliders
                    </h2>
                    
                    <div className="space-y-3">
                      {(
                        [
                          ["warmth", config.warmth],
                          ["humor", config.humor],
                          ["directness", config.directness],
                          ["sensitivity", config.sensitivity],
                          ["pride", config.pride],
                        ] as const
                      ).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold capitalize text-zinc-600 dark:text-zinc-400 w-20">{key}</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={value}
                            onChange={(e) =>
                              setConfig({ ...config, [key]: Number(e.target.value) })
                            }
                            className="flex-1 accent-sky-500 cursor-pointer h-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700"
                          />
                          <span className="text-xs font-mono font-medium text-zinc-500 w-6 text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MIMIC TAB */}
              {activeTab === "mimic" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-sky-50/10 dark:bg-sky-950/5 text-xs text-sky-800 dark:text-sky-200 space-y-1.5 flex items-start gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-sky-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Mimic a Loved One's Voice</p>
                      <p className="leading-relaxed">
                        Add sample messages from a loved one (like your partner, sibling, or close friend). Humibot will analyze these style samples to learn their long-term texting patterns, slang, emojis, and rhythm.
                      </p>
                    </div>
                  </div>

                  {/* List existing samples */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Style Samples ({styleSamples.length})</h3>
                    {styleSamples.length === 0 ? (
                      <div className="text-center py-8 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 text-sm">
                        No style samples added yet. Add your first one below!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {styleSamples.map((sample, idx) => (
                          <div
                            key={idx}
                            className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20"
                          >
                            <div className="space-y-1 min-w-0">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                                {sample.label}
                              </span>
                              <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                "{sample.content}"
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteStyleSample(idx)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                              aria-label="Delete style sample"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add style sample form */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Plus className="h-4.5 w-4.5 text-sky-500" /> Add Style Sample
                    </h3>
                    <Field label="Context/Label">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        placeholder="e.g. When apologizing, Greeting, Late night texting"
                        value={sampleLabel}
                        onChange={(e) => setSampleLabel(e.target.value)}
                      />
                    </Field>
                    <Field label="Message Text">
                      <textarea
                        rows={3}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 font-mono leading-relaxed"
                        placeholder="Copy-paste raw messages here... (e.g. 'hey im so sorry about that text, talk tmr? xx')"
                        value={sampleContent}
                        onChange={(e) => setSampleContent(e.target.value)}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={addStyleSample}
                      disabled={!sampleLabel.trim() || !sampleContent.trim()}
                      className="w-full rounded-xl bg-sky-500 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-50 transition-colors"
                    >
                      Append Style Sample
                    </button>
                  </div>
                </div>
              )}

              {/* TRAITS & TONES TAB */}
              {activeTab === "custom" && (
                <div className="space-y-5">
                  {/* Tones Section */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3.5 bg-zinc-50/20 dark:bg-zinc-900/10">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-sky-500" /> Custom Tones
                    </h2>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {config.tones.length === 0 ? (
                        <span className="text-xs text-zinc-400 italic">No custom tones added yet.</span>
                      ) : (
                        config.tones.map((tone) => (
                          <span
                            key={tone}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          >
                            {tone}
                            <button
                              type="button"
                              onClick={() => removeTone(tone)}
                              className="text-zinc-400 hover:text-rose-500 transition-colors font-bold text-[10px]"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        placeholder="Add custom tone... e.g. playful, mysterious"
                        value={newTone}
                        onChange={(e) => setNewTone(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTone();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addTone}
                        className="rounded-xl bg-sky-500 px-3 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Custom Fields Section */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Info className="h-4 w-4 text-sky-500" /> Custom Trait Key-Values</span>
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Row
                      </button>
                    </h2>

                    <div className="space-y-2.5">
                      {Object.keys(config.customFields).length === 0 ? (
                        <p className="text-xs text-zinc-400 italic text-center py-4">No custom fields defined yet. Add rows to define traits like "Favorite Coffee" or "Cat Name".</p>
                      ) : (
                        Object.entries(config.customFields).map(([key, value], idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-900"
                              placeholder="Parameter name (e.g. Pets)"
                              value={key}
                              onChange={(e) => updateCustomFieldKey(key, e.target.value)}
                            />
                            <span className="text-zinc-400 font-bold">:</span>
                            <input
                              className="flex-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              placeholder="Value (e.g. Golden Retriever)"
                              value={value}
                              onChange={(e) => updateCustomFieldValue(key, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => deleteCustomField(key)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Interests & Goals */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                    <Field label="Interests (comma separated)">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        value={interestsText}
                        onChange={(e) => setInterestsText(e.target.value)}
                      />
                    </Field>

                    <Field label="Goals (comma separated)">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        value={goalsText}
                        onChange={(e) => setGoalsText(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* SCHEDULE & TEST TAB */}
              {activeTab === "schedule" && (
                <div className="space-y-5">
                  {/* Proactive Test Widget */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-indigo-50/10 dark:bg-indigo-950/5">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
                      <Play className="h-4 w-4 text-indigo-500 fill-indigo-500" /> Proactive Initiative Test
                    </h2>
                    
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Humibot evaluates initiative checks periodically. Test their scores dynamically right now.
                    </p>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-600 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          checked={forceSend}
                          onChange={(e) => setForceSend(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-sky-500 accent-sky-500"
                        />
                        Bypass scores & force text bubble generation
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={runInitiativeTest}
                      disabled={testingInitiative}
                      className="w-full rounded-xl bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      {testingInitiative ? "Evaluating Check..." : "Run Initiative Check"}
                    </button>

                    {testResult && (
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                          <span className="text-zinc-700 dark:text-zinc-300">Test Outcome</span>
                          <span className={testResult.sent ? "text-emerald-500 flex items-center gap-1" : "text-amber-500 flex items-center gap-1"}>
                            {testResult.sent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {testResult.sent ? "Sent Text Message" : "Skipped Texting"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1.5 text-zinc-600 dark:text-zinc-400">
                          <span>Impulse Score:</span>
                          <span className="font-mono text-right font-bold text-zinc-800 dark:text-zinc-200">
                            {testResult.score} / {testResult.threshold} (min)
                          </span>
                          <span>Reasoning:</span>
                          <span className="text-right truncate font-mono">{testResult.reason}</span>
                          <span>Planned Intent:</span>
                          <span className="text-right font-mono text-sky-600 dark:text-sky-400">{testResult.intent}</span>
                          <span>Companion Mood:</span>
                          <span className="text-right capitalize font-mono">
                            {testResult.runtimeMood} ({testResult.runtimeMoodIntensity}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Logs of recent checks */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between items-center">
                        <span>Evaluation Log History</span>
                        <button
                          type="button"
                          onClick={loadInitiativeLogs}
                          className="hover:text-sky-500 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </h3>
                      {initiativeLogs.length === 0 ? (
                        <p className="text-[11px] text-zinc-400 italic text-center py-2">No initiative logs recorded yet.</p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {initiativeLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-100 dark:border-zinc-900/50"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    log.sent ? "bg-emerald-400 animate-pulse" : "bg-zinc-300 dark:bg-zinc-700"
                                  }`}
                                />
                                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                                  Score: {log.impulseScore}
                                </span>
                                <span className="text-zinc-400 truncate max-w-[120px] sm:max-w-[180px] font-mono">
                                  ({log.reason})
                                </span>
                              </div>
                              <span className="text-zinc-400 font-mono">
                                {new Date(log.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daily Schedule Blocks */}
                  <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2">Daily schedule</p>
                    <div className="space-y-3">
                      {schedule.map((block) => (
                        <div
                          key={block.id}
                          className="space-y-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 border border-zinc-100 dark:border-zinc-800"
                        >
                          <input
                            className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 px-2.5 py-1 text-sm font-semibold"
                            value={block.label}
                            onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <TimeField
                              label="Start"
                              hour={block.startHour}
                              minute={block.startMinute}
                              onChange={(startHour, startMinute) =>
                                updateBlock(block.id, { startHour, startMinute })
                              }
                            />
                            <TimeField
                              label="End"
                              hour={block.endHour}
                              minute={block.endMinute}
                              onChange={(endHour, endMinute) =>
                                updateBlock(block.id, { endHour, endMinute })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-zinc-500 capitalize">{label}</span>
      {children}
    </label>
  );
}

function TimeField({
  label,
  hour,
  minute,
  onChange,
}: {
  label: string;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-zinc-400 text-[10px] font-bold uppercase">{label}</span>
      <div className="flex gap-1">
        <input
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onChange(Number(e.target.value), minute)}
          className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 px-2 py-0.5 text-center font-semibold"
        />
        <span className="text-zinc-400 self-center font-bold">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={minute}
          onChange={(e) => onChange(hour, Number(e.target.value))}
          className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 px-2 py-0.5 text-center font-semibold"
        />
      </div>
    </label>
  );
}
