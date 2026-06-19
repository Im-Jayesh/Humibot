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
  Eye,
  Sliders,
  Settings,
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
  const [activeTab, setActiveTab] = useState<"companion" | "mimic" | "user" | "advanced">("companion");

  // User Profile state
  const [userProfileData, setUserProfileData] = useState<{
    name: string;
    location: string;
    profession: string;
    facts: string[];
  }>({ name: "", location: "", profession: "", facts: [] });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Style Sample adding states
  const [sampleLabel, setSampleLabel] = useState("");
  const [sampleContent, setSampleContent] = useState("");

  // Tones adding state
  const [newTone, setNewTone] = useState("");

  // Local state for comma separated inputs
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
      const [res, profileRes] = await Promise.all([
        fetch("/api/persona", { cache: "no-store" }),
        fetch("/api/persona/profile", { cache: "no-store" }),
      ]);
      if (!res.ok || !profileRes.ok) throw new Error("Could not load settings");
      
      const data = await res.json();
      const profileData = await profileRes.json();
      
      setConfig(data.config);
      setSchedule(data.runtime.schedule ?? defaultSchedule);
      setStyleSamples(data.styleSamples ?? []);
      setInterestsText(data.config.interests.join(", "));
      setGoalsText(data.config.goals.join(", "));
      
      setUserProfileData(profileData.profile ?? { name: "", location: "", profession: "", facts: [] });
    } catch {
      setError("Failed to load settings.");
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

    try {
      const [res, profileRes] = await Promise.all([
        fetch("/api/persona", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ config: updatedConfig, schedule, styleSamples }),
        }),
        fetch("/api/persona/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(userProfileData),
        }),
      ]);

      setSaving(false);

      if (!res.ok || !profileRes.ok) {
        setError("Save failed. Check your connection.");
        return;
      }

      const data = await res.json();
      const profileData = await profileRes.json();

      setConfig(data.config);
      setSchedule(data.runtime.schedule ?? schedule);
      setStyleSamples(data.styleSamples ?? styleSamples);
      setInterestsText(data.config.interests.join(", "));
      setGoalsText(data.config.goals.join(", "));
      setUserProfileData(profileData.profile ?? userProfileData);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaving(false);
      setError("Failed to save settings.");
    }
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

  // User profile facts helper functions
  function deleteUserFact(index: number) {
    setUserProfileData((prev) => ({
      ...prev,
      facts: prev.facts.filter((_, i) => i !== index),
    }));
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
    <div className="flex h-[100dvh] w-full justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <div className="flex h-full w-full min-w-0 flex-col bg-white dark:bg-zinc-900 border-x border-zinc-200/50 dark:border-zinc-800/50 sm:max-w-lg md:max-w-xl shadow-2xl shadow-sky-500/5">
        
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-150 dark:border-zinc-800/80 px-4 py-4 backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200 hover:-translate-x-0.5 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                Configuration Dashboard
              </h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Tune your companion & user parameters</p>
            </div>
          </div>
          <button
            onClick={save}
            disabled={saving || loading}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:brightness-105 active:scale-97 disabled:opacity-50 transition-all duration-200"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </header>

        {/* Tab Selection */}
        <div className="flex shrink-0 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-1.5 gap-1.5">
          {[
            { id: "companion", label: "Companion", icon: Sliders },
            { id: "mimic", label: "Mimic Voice", icon: Heart },
            { id: "user", label: "About Me", icon: User },
            { id: "advanced", label: "Advanced Core", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-1 flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${
                  active
                    ? "bg-white dark:bg-zinc-800 text-sky-500 shadow-sm dark:shadow-zinc-950/30 scale-102"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100/30 dark:hover:bg-zinc-800/30"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 transition-colors ${active ? "text-sky-500" : "text-zinc-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Main Area */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-sky-500" />
              <p className="mt-4 text-xs font-semibold tracking-wider text-zinc-400 uppercase">Synchronizing...</p>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {error ? (
                <div className="rounded-xl border border-rose-200/50 bg-rose-50/50 dark:bg-rose-950/20 px-3.5 py-3 text-xs text-rose-700 dark:text-rose-300 backdrop-blur-sm animate-shake">
                  {error}
                </div>
              ) : null}

              {saved ? (
                <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 dark:bg-emerald-950/20 px-3.5 py-3 text-xs text-emerald-700 dark:text-emerald-300 backdrop-blur-sm flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Configuration saved and updated!
                </div>
              ) : null}

              {/* COMPANION TAB */}
              {activeTab === "companion" && (
                <div className="space-y-5 animate-slideUp">
                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                      <User className="h-4 w-4 text-sky-500" /> Identity Matrix
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <Field label="Name">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          value={config.name}
                          onChange={(e) => setConfig({ ...config, name: e.target.value })}
                        />
                      </Field>

                      <Field label="Gender">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          value={config.gender}
                          onChange={(e) => setConfig({ ...config, gender: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <Field label="Location">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          placeholder="Unspecified"
                          value={config.location}
                          onChange={(e) => setConfig({ ...config, location: e.target.value })}
                        />
                      </Field>

                      <Field label="Profession">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          placeholder="Unspecified"
                          value={config.profession}
                          onChange={(e) => setConfig({ ...config, profession: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <Field label="Relationship Status">
                        <select
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
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

                      <Field label="Conversational Tone">
                        <select
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
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

                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4.5 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                      <Sliders className="h-4 w-4 text-sky-500" /> Personality Calibration
                    </h2>
                    
                    <div className="space-y-4">
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
                          <span className="text-xs font-semibold capitalize text-zinc-500 dark:text-zinc-400 w-20">{key}</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={value}
                            onChange={(e) =>
                              setConfig({ ...config, [key]: Number(e.target.value) })
                            }
                            className="flex-1 accent-sky-500 cursor-pointer h-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none"
                          />
                          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 w-8 text-right bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MIMIC TAB */}
              {activeTab === "mimic" && (
                <div className="space-y-5 animate-slideUp">
                  <div className="rounded-2xl border border-sky-100 dark:border-sky-950 bg-sky-50/20 dark:bg-sky-950/10 p-4 text-xs text-sky-800 dark:text-sky-300 space-y-1.5 flex items-start gap-3 shadow-sm">
                    <Info className="h-4.5 w-4.5 shrink-0 text-sky-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-sky-900 dark:text-sky-200">Mimic Texting Voice</p>
                      <p className="leading-relaxed mt-0.5 text-zinc-500 dark:text-zinc-400">
                        Teach Humibot how to message like a loved one. Paste real text messages (slang, emojis, typos, and all). The bot uses these samples as reference constraints to form its long-term style.
                      </p>
                    </div>
                  </div>

                  {/* List existing samples */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Style Library ({styleSamples.length})</h3>
                    {styleSamples.length === 0 ? (
                      <div className="text-center py-10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 text-sm">
                        No samples configured. Put your first messaging reference below!
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto">
                        {styleSamples.map((sample, idx) => (
                          <div
                            key={idx}
                            className="group flex items-start justify-between gap-3 p-3 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/30 hover:border-sky-500/30 transition-all duration-200"
                          >
                            <div className="space-y-1 min-w-0">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400">
                                {sample.label}
                              </span>
                              <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed italic mt-1">
                                "{sample.content}"
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteStyleSample(idx)}
                              className="rounded-xl p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add style sample form */}
                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <Plus className="h-4 w-4 text-sky-500" /> Add New Sample
                    </h3>
                    <Field label="Context / Situation">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                        placeholder="e.g. Apologizing, Saying goodnight, Excited greeting"
                        value={sampleLabel}
                        onChange={(e) => setSampleLabel(e.target.value)}
                      />
                    </Field>
                    <Field label="Exact Text Message Content">
                      <textarea
                        rows={3}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-mono leading-relaxed"
                        placeholder="Paste message text..."
                        value={sampleContent}
                        onChange={(e) => setSampleContent(e.target.value)}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={addStyleSample}
                      disabled={!sampleLabel.trim() || !sampleContent.trim()}
                      className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-105 active:scale-97 disabled:opacity-50 transition-all"
                    >
                      Append Sample to Matrix
                    </button>
                  </div>
                </div>
              )}

              {/* ABOUT ME TAB */}
              {activeTab === "user" && (
                <div className="space-y-5 animate-slideUp">
                  <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 text-xs text-indigo-800 dark:text-indigo-300 space-y-1.5 flex items-start gap-3 shadow-sm">
                    <Sparkles className="h-4.5 w-4.5 shrink-0 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-indigo-900 dark:text-indigo-200">User Identity Mapping</p>
                      <p className="leading-relaxed mt-0.5 text-zinc-500 dark:text-zinc-400">
                        Humibot automatically extracts your profile details (name, job, location, habits, preferences) as you chat. You can view, add, or prune these parameters to keep your profile accurate.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                      <User className="h-4 w-4 text-indigo-500" /> Personal Details
                    </h2>
                    
                    <Field label="My Name">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                        placeholder="What should the companion call you?"
                        value={userProfileData.name}
                        onChange={(e) => setUserProfileData({ ...userProfileData, name: e.target.value })}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3.5">
                      <Field label="My Location">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          placeholder="e.g. Seattle, WA"
                          value={userProfileData.location}
                          onChange={(e) => setUserProfileData({ ...userProfileData, location: e.target.value })}
                        />
                      </Field>

                      <Field label="My Profession">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          placeholder="e.g. Designer, Student"
                          value={userProfileData.profession}
                          onChange={(e) => setUserProfileData({ ...userProfileData, profession: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Automatic Facts List */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Automatic Memory Facts ({userProfileData.facts.length})</span>
                      <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full lowercase">learned via chat</span>
                    </h3>
                    
                    {userProfileData.facts.length === 0 ? (
                      <div className="text-center py-10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 text-sm">
                        No facts learned yet. Keep chatting to see memories populate!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {userProfileData.facts.map((fact, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-900/20 hover:border-indigo-500/20 transition-all duration-200"
                          >
                            <span className="text-sm text-zinc-750 dark:text-zinc-350 font-medium leading-relaxed">
                              {fact}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteUserFact(idx)}
                              className="rounded-xl p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ADVANCED CORE TAB */}
              {activeTab === "advanced" && (
                <div className="space-y-5 animate-slideUp">
                  {/* Proactive Initiative Test */}
                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                      <Play className="h-4 w-4 text-indigo-500" /> Proactive Initiative Test
                    </h2>
                    
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Humibot evaluates texting checks periodically. Force or simulate an initiative check to verify scores.
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="forceSendCheckbox"
                        checked={forceSend}
                        onChange={(e) => setForceSend(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-sky-500 accent-sky-500"
                      />
                      <label htmlFor="forceSendCheckbox" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                        Force bubble generation (bypass threshold & cooldown)
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={runInitiativeTest}
                      disabled={testingInitiative}
                      className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-650 py-2.5 text-xs font-bold text-white shadow-md active:scale-97 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-white border-none" />
                      {testingInitiative ? "Evaluating Check..." : "Execute Initiative Check"}
                    </button>

                    {testResult && (
                      <div className="rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3.5 text-xs space-y-2.5 font-medium animate-fadeIn">
                        <div className="flex items-center justify-between font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <span className="text-zinc-700 dark:text-zinc-300">Test Outcome</span>
                          <span className={testResult.sent ? "text-emerald-500 flex items-center gap-1" : "text-amber-500 flex items-center gap-1"}>
                            {testResult.sent ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {testResult.sent ? "Text Message Sent" : "Check Skipped"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-zinc-500 dark:text-zinc-400">
                          <span>Impulse Score:</span>
                          <span className="font-mono text-right font-bold text-zinc-800 dark:text-zinc-200">
                            {testResult.score} / {testResult.threshold} (min)
                          </span>
                          <span>Reason:</span>
                          <span className="text-right truncate font-mono text-zinc-700 dark:text-zinc-300">{testResult.reason}</span>
                          <span>Planned Intent:</span>
                          <span className="text-right font-mono text-sky-500 dark:text-sky-400">{testResult.intent}</span>
                          <span>Runtime Mood:</span>
                          <span className="text-right capitalize font-mono text-zinc-700 dark:text-zinc-300">
                            {testResult.runtimeMood} ({testResult.runtimeMoodIntensity}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Logs of recent checks */}
                    <div className="space-y-2.5">
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between items-center">
                        <span>Check history logs</span>
                        <button
                          type="button"
                          onClick={loadInitiativeLogs}
                          className="text-zinc-400 hover:text-sky-500 transition-colors p-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </h3>
                      {initiativeLogs.length === 0 ? (
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic text-center py-2">No initiative logs recorded yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {initiativeLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-100 dark:border-zinc-800/40"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    log.sent ? "bg-emerald-400 animate-pulse" : "bg-zinc-300 dark:bg-zinc-700"
                                  }`}
                                />
                                <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                                  Score: {log.impulseScore}
                                </span>
                                <span className="text-zinc-400 dark:text-zinc-500 truncate max-w-[120px] sm:max-w-[180px] font-mono">
                                  ({log.reason})
                                </span>
                              </div>
                              <span className="text-zinc-400 dark:text-zinc-500 font-mono">
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
                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">Daily Schedule</p>
                    <div className="space-y-3.5">
                      {schedule.map((block) => (
                        <div
                          key={block.id}
                          className="space-y-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 p-3 border border-zinc-150 dark:border-zinc-850"
                        >
                          <input
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-sm font-semibold"
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

                  {/* Custom Tones */}
                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-sky-500" /> Companion Custom Tones
                    </h2>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {config.tones.length === 0 ? (
                        <span className="text-xs text-zinc-400 italic">No custom tones added.</span>
                      ) : (
                        config.tones.map((tone) => (
                          <span
                            key={tone}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350"
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
                        className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500"
                        placeholder="Add custom tone... e.g. playful, quiet"
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
                        className="rounded-xl bg-sky-500 hover:bg-sky-650 px-4 text-xs font-bold text-white shadow-sm transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Custom Traits (Key-Value) */}
                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Info className="h-4 w-4 text-sky-500" /> Companion Custom Parameters</span>
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Plus className="h-3 w-3" /> Add Row
                      </button>
                    </h2>

                    <div className="space-y-2.5">
                      {Object.keys(config.customFields).length === 0 ? (
                        <p className="text-xs text-zinc-400 italic text-center py-4">No custom fields defined.</p>
                      ) : (
                        Object.entries(config.customFields).map(([key, value], idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-800"
                              placeholder="Parameter"
                              value={key}
                              onChange={(e) => updateCustomFieldKey(key, e.target.value)}
                            />
                            <span className="text-zinc-350 font-bold">:</span>
                            <input
                              className="flex-1.5 rounded-xl border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                              placeholder="Value"
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
                  <div className="rounded-2xl border border-zinc-150 dark:border-zinc-800/60 p-4 space-y-4 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <Field label="Companion Interests (comma separated)">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500"
                        value={interestsText}
                        onChange={(e) => setInterestsText(e.target.value)}
                      />
                    </Field>

                    <Field label="Companion Goals (comma separated)">
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-sky-500"
                        value={goalsText}
                        onChange={(e) => setGoalsText(e.target.value)}
                      />
                    </Field>
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
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 capitalize">{label}</span>
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
      <span className="text-zinc-450 dark:text-zinc-550 text-[10px] font-bold uppercase">{label}</span>
      <div className="flex gap-1">
        <input
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onChange(Number(e.target.value), minute)}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-0.5 text-center font-bold"
        />
        <span className="text-zinc-400 self-center font-bold">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={minute}
          onChange={(e) => onChange(hour, Number(e.target.value))}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-0.5 text-center font-bold"
        />
      </div>
    </label>
  );
}
