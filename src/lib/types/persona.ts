import { z } from "zod";

export const relationshipSchema = z.enum([
  "friend",
  "crush",
  "partner",
  "sibling",
  "mentor",
  "rival",
]);

export const talkingStyleSchema = z.enum([
  "friendly",
  "serious",
  "sarcastic",
  "soft",
]);

export const moodSchema = z.enum([
  "happy",
  "calm",
  "bored",
  "lonely",
  "anxious",
  "annoyed",
  "hurt",
  "excited",
  "tired",
]);

export const availabilitySchema = z.enum(["free", "busy", "sleeping"]);

export const personaConfigSchema = z.object({
  name: z.string().min(1).max(40),
  gender: z.string().min(1).max(40),
  relationship: relationshipSchema,
  talkingStyle: talkingStyleSchema,
  location: z.string().max(80).default(""),
  profession: z.string().max(80).default(""),
  warmth: z.number().min(0).max(100),
  humor: z.number().min(0).max(100),
  directness: z.number().min(0).max(100),
  sensitivity: z.number().min(0).max(100),
  pride: z.number().min(0).max(100),
  interests: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  tones: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.string()).default({}),
});

export const scheduleBlockSchema = z.object({
  id: z.string(),
  label: z.string(),
  startHour: z.number().min(0).max(23),
  startMinute: z.number().min(0).max(59),
  endHour: z.number().min(0).max(23),
  endMinute: z.number().min(0).max(59),
  days: z.array(z.number().min(0).max(6)),
});

export const styleSampleSchema = z.object({
  id: z.number().optional(),
  label: z.string().min(1).max(60),
  content: z.string().min(1).max(2000),
  role: z.string().max(40).default("loved_one"),
});

export const egoStateSchema = z.object({
  selfWorth: z.number().min(0).max(100),
  pride: z.number().min(0).max(100),
  frustration: z.number().min(0).max(100),
  needForValidation: z.number().min(0).max(100),
});

export const personaRuntimeSchema = z.object({
  mood: moodSchema,
  moodIntensity: z.number().min(0).max(100),
  ego: egoStateSchema,
  availability: availabilitySchema,
  activity: z.string(),
  lastInteractionAt: z.string().nullable(),
  messagesSentToday: z.number(),
  wasIgnored: z.boolean(),
});

export type Relationship = z.infer<typeof relationshipSchema>;
export type TalkingStyle = z.infer<typeof talkingStyleSchema>;
export type Mood = z.infer<typeof moodSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type PersonaConfig = z.infer<typeof personaConfigSchema>;
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;
export type StyleSample = z.infer<typeof styleSampleSchema>;
export type EgoState = z.infer<typeof egoStateSchema>;
export type PersonaRuntime = z.infer<typeof personaRuntimeSchema>;

export const defaultPersonaConfig: PersonaConfig = {
  name: "Alex",
  gender: "non-binary",
  relationship: "friend",
  talkingStyle: "friendly",
  location: "",
  profession: "",
  warmth: 70,
  humor: 60,
  directness: 50,
  sensitivity: 55,
  pride: 65,
  interests: ["music", "late-night walks", "weird documentaries"],
  goals: ["get better at cooking", "finish that side project"],
  tones: [],
  customFields: {},
};

export const defaultSchedule: ScheduleBlock[] = [
  {
    id: "morning",
    label: "morning routine",
    startHour: 7,
    startMinute: 0,
    endHour: 9,
    endMinute: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "work",
    label: "work / classes",
    startHour: 9,
    startMinute: 30,
    endHour: 17,
    endMinute: 0,
    days: [1, 2, 3, 4, 5],
  },
  {
    id: "evening",
    label: "free time",
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "sleep",
    label: "sleeping",
    startHour: 23,
    startMinute: 30,
    endHour: 7,
    endMinute: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
];
