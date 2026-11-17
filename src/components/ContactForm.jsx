import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  PHONE_COUNTRIES,
  DEFAULT_PHONE_COUNTRY,
  findPhoneCountry,
  isValidLocalNumber,
} from "../lib/phoneCountries";
import { readStoredUtmParams } from "../lib/utm";
import { trackConversion } from "../lib/conversions";

const CLOUDINARY_CLOUD_NAME = "djlm0st0d";
const CLOUDINARY_UPLOAD_PRESET = "HOAISTHEBEST";

/* ──────────────────────────────────────────────────────────────────────────
   Form schema — built from /docs/HOA Lead Form Question.docx
   Step types:
     intro    – welcome page
     section  – chapter divider (Section 1 — Ambition)
     long     – multi-line answer (textarea, up to ~300 words)
     choice   – multiple choice (single-select, auto-advance)
     multi    – multiple choice (multi-select, manual advance)
     text     – single-line text (name, company, website)
     email    – email input
     phone    – phone with country code
     date     – next-day-or-later, no Sat/Sun
     time     – 2h slots between 12:00 – 18:00
     file     – file upload (single or multiple) → Cloudinary (unsigned)
     slider   – one or more sliders, EMI-calculator style; each can be
                a numeric range (mode:"number") or discrete options (mode:"options")
     outro    – WhatsApp CTA / thank-you
   Each question step may have `q`, `subtitle`, `placeholder`, `required`,
   `options`, `optional`, `section`.

   ── Drop-off resume ──
   Form state ({step, data, phoneCC, savedAt}) is mirrored to localStorage on
   every change while open. On reopen we offer "Continue where you left off".

   ── Analytics ──
   We write {type, sessionId, formId, at, ...} docs to a `formEvents`
   collection: "opened" once per session, "completed" on successful submit,
   "dropped" on close after answering ≥1 question without submitting.
   ────────────────────────────────────────────────────────────────────────── */

const FORM_ID = "hoa-lead-form-v1";
/* Bumped whenever the default question set changes shape — saved progress
   stores a step *index*, so resuming an old run against a new schema would
   drop the visitor on the wrong question. A new key simply retires it. */
const SCHEMA_VERSION = 2;

const SECTIONS = {
  ambition: {
    num: 1,
    name: "Ambition",
    tagline: "What are you really trying to build?",
  },
  reality: {
    num: 2,
    name: "Reality",
    tagline: "Where do you actually stand today?",
  },
  thinking: {
    num: 3,
    name: "Thinking",
    tagline: "How do you make decisions when things get uncertain?",
  },
  alignment: {
    num: 4,
    name: "Alignment",
    tagline: "Do we even work well together?",
  },
  logistics: {
    num: 5,
    name: "Logistics",
    tagline: "The basics, so we know how to reach you.",
  },
};

const SPECIFIC_HINT = "Be as specific as you can.";

const STEPS = [
  /* INTRO */
  {
    type: "intro",
    title: "This is not for everyone.\nAnd that's intentional.",
    body: [
      "We work with a small number of founders who are serious about building something meaningful — and willing to do it properly.",
      "This form asks for a little more thought than the usual enquiry form. That's intentional too. The questions help us understand the business before we start talking about solutions.",
      "If you're looking for a low-commitment experiment, a quick execution partner, or makeshift solutions, we're probably not the right fit.",
    ],
    note: "Take around 15 minutes.\nThe clearer you are, the more useful the conversation becomes.",
    cta: "Begin",
  },

  /* ── SECTION 1 — AMBITION ── */
  { type: "section", section: "ambition" },
  {
    type: "choice",
    key: "categoryStance",
    section: "ambition",
    q: "Which feels closest to the truth about what you're building?",
    subtitle:
      "There is no wrong answer here. Self-awareness is more useful than originality for originality's sake.",
    options: [
      "We're creating something entirely different from what already exists.",
      "The category already exists, but we believe we have a genuinely different approach.",
      "We're entering an established category and still figuring out what will make us distinct.",
      "We're building something similar to existing alternatives and wish to stand as competitors.",
    ],
  },
  {
    type: "long",
    key: "problem",
    section: "ambition",
    q: "What problem is your product or service solving? For whom? And what makes your approach meaningfully different?",
    subtitle: SPECIFIC_HINT,
    placeholder: "Type your answer…",
    required: true,
  },
  {
    type: "long",
    key: "motivation",
    section: "ambition",
    q: "What motivates you to build this brand or business?",
    subtitle: SPECIFIC_HINT,
    placeholder: "Type your answer…",
    required: true,
  },
  {
    type: "long",
    key: "success24",
    section: "ambition",
    q: "What does success look like for your brand in the next 24 months?",
    subtitle: SPECIFIC_HINT,
    placeholder: "Type your answer…",
    required: true,
  },
  {
    type: "long",
    key: "perception",
    section: "ambition",
    q: "When people encounter your brand, what do you want them to think, feel or say about it?",
    subtitle: SPECIFIC_HINT,
    placeholder: "Type your answer…",
    required: true,
  },

  /* ── SECTION 2 — REALITY ── */
  { type: "section", section: "reality" },
  {
    type: "choice",
    key: "stage",
    section: "reality",
    q: "Which best describes your brand?",
    options: [
      "Idea / pre-launch",
      "Early stage — under ₹10L annual revenue",
      "Growing — ₹10L–₹1Cr annual revenue",
      "Scaling — ₹1Cr+ annual revenue",
      "Pre-revenue, but funded / capital committed",
    ],
  },
  {
    type: "choice",
    key: "capital",
    section: "reality",
    q: "How much capital are you ready to deploy per month for branding & marketing?",
    subtitle:
      "This helps us understand what level of involvement is realistic.",
    options: ["₹3L – ₹7L", "₹7L – ₹15L", "₹15L – ₹30L", "₹30L+"],
  },
  {
    type: "choice",
    key: "broken",
    section: "reality",
    q: "If you could fix one thing first, what would it be?",
    options: [
      "Positioning & differentiation (we don't stand out)",
      "Conversions / sales consistency (traffic → no sales)",
      "Brand perception (we don't feel premium / trusted)",
      "Scaling profitably (growth is unstable or expensive)",
      "Still defining the business model",
    ],
  },

  /* ── SECTION 3 — THINKING ── */
  { type: "section", section: "thinking" },
  {
    type: "choice",
    key: "approach",
    section: "thinking",
    q: "Which statement feels closest to your approach?",
    options: [
      "I'm building for long-term category leadership (not short-term wins)",
      "I want structured scaling with clear systems in place",
      "I'm ready to invest aggressively if the direction is clear",
      "I'm still figuring things out and exploring",
    ],
  },
  {
    type: "choice",
    key: "operate",
    section: "thinking",
    q: "What kind of relationship are you looking for?",
    options: [
      "A strategic partner who challenges our thinking and builds with us.",
      "A team that can lead strategy and execution while I focus on the business.",
      "Specialists brought in to solve clearly defined problems.",
      "An execution partner for a direction we have largely already decided.",
    ],
  },

  /* ── SECTION 4 — ALIGNMENT ── */
  { type: "section", section: "alignment" },
  {
    type: "choice",
    key: "agencyFit",
    section: "alignment",
    q: "We don't operate like a traditional agency.",
    subtitle:
      "We assign a dedicated team that works deeply on a single business — not across multiple clients. Zero parallel projects, deeper involvement, higher expectations from both sides. Which best describes you?",
    options: [
      "I'm looking for a traditional agency setup",
      "I like the idea, but I'm unsure",
      "I understand this and prefer this level of focus",
    ],
  },
  {
    type: "choice",
    key: "tanFit",
    section: "alignment",
    q: "Some businesses need more than execution.",
    subtitle:
      "Through TAN we bring in C-suite expertise, get deeply involved in decision-making, and align through equity (not just fees). High-commitment, long-term — not suitable for every business. Only a small number of businesses qualify for this level of involvement.",
    options: [
      "I'm only looking for a service-based engagement (HOA)",
      "I'm open to understanding this, but not sure yet",
      "I'm actively looking for this level of involvement and sharing equity (TAN)",
    ],
  },

  /* ── SECTION 5 — LOGISTICS ── */
  { type: "section", section: "logistics" },
  {
    type: "text",
    key: "name",
    section: "logistics",
    q: "What's your name?",
    placeholder: "First and last name",
    required: true,
    autocomplete: "name",
  },
  {
    type: "email",
    key: "email",
    section: "logistics",
    q: "Your email?",
    placeholder: "name@company.com",
    required: true,
    autocomplete: "email",
  },
  {
    type: "phone",
    key: "phone",
    section: "logistics",
    q: "Phone number (WhatsApp).",
    placeholder: "98765 43210",
    required: true,
  },
  {
    type: "text",
    key: "company",
    section: "logistics",
    q: "Company name.",
    placeholder: "Your brand or business",
    required: true,
    autocomplete: "organization",
  },
  {
    type: "text",
    key: "website",
    section: "logistics",
    q: "Website.",
    subtitle: "Optional.",
    placeholder: "https://",
    required: false,
    autocomplete: "url",
  },
  {
    type: "choice",
    key: "timezone",
    section: "logistics",
    q: "Our team operates from Gurugram, India (GMT +5:30).",
    subtitle: "Are you comfortable collaborating across this timezone?",
    options: ["Yes", "Yes, with some scheduling adjustments", "Not sure"],
  },
  {
    type: "date",
    key: "callDate",
    section: "logistics",
    q: "If you'd like to move this forward quickly, pick a day for a call.",
    subtitle: "Earliest is tomorrow. Saturdays and Sundays are off.",
    optional: true,
  },
  {
    type: "time",
    key: "callTime",
    section: "logistics",
    q: "And a 2-hour slot.",
    subtitle: "All slots are in IST (GMT +5:30).",
    optional: true,
  },
  {
    type: "long",
    key: "expectations",
    section: "logistics",
    q: "One last question. What do you genuinely expect from us?",
    subtitle:
      "Tell us what you want HOA to change, solve or make possible for your business. Be candid. We'll tell you what we believe we can help with — and what we can't.",
    placeholder: "Type your answer…",
    required: true,
  },

  /* OUTRO */
  {
    type: "outro",
    title: "That's everything.",
    body: [
      "We'll go through what you've shared and see whether there's a meaningful fit.",
      "If you'd rather continue the conversation directly, you can reach us on WhatsApp.",
    ],
  },
];

const QUESTION_STEPS = STEPS.filter(
  (s) => !["intro", "section", "outro"].includes(s.type),
);
const TOTAL_QUESTIONS = QUESTION_STEPS.length;

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

/* Phone country list moved to `lib/phoneCountries.js` so the dropdown can
   surface every country with its dial code, flag, and a per-country digit
   range used for placeholder + validation. */

const formatDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const minBookingDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  // skip Sat (6) & Sun (0)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return formatDateInput(d);
};

const isValidDate = (s) => {
  if (!s) return false;
  const d = new Date(s + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  const min = new Date(minBookingDate() + "T00:00:00");
  return d.getTime() >= min.getTime();
};

const TIME_SLOTS = ["12:00 – 14:00", "14:00 – 16:00", "16:00 – 18:00"];

const isEmail = (s) => /\S+@\S+\.\S+/.test(s);
const isPhone = (s, ccIso) => {
  const country = findPhoneCountry(ccIso);
  return isValidLocalNumber(s, country);
};

const readUtmParams = () => {
  if (typeof window === "undefined") return {};
  try {
    // Stored params come from the original landing page (in case the visitor
    // has since navigated to /apply, which carries no query string of its
    // own); any of the same keys present on the current URL take priority.
    const out = { ...readStoredUtmParams() };
    const p = new URLSearchParams(window.location.search);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      // Meta-specific that the doc lists separately
      "campaign",
      "adset",
      "ad",
      "creative",
    ].forEach((k) => {
      const v = p.get(k);
      if (v) out[k] = v;
    });
    return out;
  } catch {
    return {};
  }
};

const newId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

/* progress persistence */
const progressKeyFor = (formId) =>
  `hoa-lead-progress::${formId || FORM_ID}::v${SCHEMA_VERSION}`;
const saveProgress = (state, formId) => {
  try {
    localStorage.setItem(
      progressKeyFor(formId),
      JSON.stringify({ ...state, savedAt: Date.now() }),
    );
  } catch {
    /* localStorage unavailable */
  }
};
const loadProgress = (formId) => {
  try {
    const key = progressKeyFor(formId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire after 14 days
    if (parsed.savedAt && Date.now() - parsed.savedAt > 14 * 24 * 3600e3) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
const clearProgress = (formId) => {
  try {
    localStorage.removeItem(progressKeyFor(formId));
  } catch {
    /* noop */
  }
};

/* analytics */
const writeFormEvent = (payload, formId) => {
  return addDoc(collection(db, "formEvents"), {
    formId: formId || FORM_ID,
    at: serverTimestamp(),
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
    ...payload,
  }).catch((e) => console.warn("[formEvents] write failed", e));
};

/* file upload — Cloudinary unsigned.

   Single-shot uploads to /auto/upload are capped at 100 MB. To support the
   200 MB-per-file ceiling we use Cloudinary's chunked upload protocol
   (X-Unique-Upload-Id + Content-Range) for any file above ~80 MB. Small
   files keep the cheaper single-request path. */

const CHUNK_THRESHOLD = 80 * 1024 * 1024; // start chunking at 80 MB
const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB per chunk — well under the 100 MB cap

const newUploadId = () =>
  `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const uploadChunk = ({ url, blob, uploadId, start, end, total, onProgress }) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", blob);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("X-Unique-Upload-Id", uploadId);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve(res);
        else
          reject(
            new Error(res?.error?.message || `Upload failed (${xhr.status})`),
          );
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });

const uploadOneToCloudinary = async (file, folder, onProgress) => {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  if (file.size <= CHUNK_THRESHOLD) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      form.append("folder", folder);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) {
          onProgress(e.loaded / Math.max(1, e.total));
        }
      };
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300) resolve(res);
          else
            reject(
              new Error(res?.error?.message || `Upload failed (${xhr.status})`),
            );
        } catch (err) {
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(form);
    });
  }

  // Chunked upload — share an X-Unique-Upload-Id across every chunk.
  const uploadId = newUploadId();
  const total = file.size;
  let uploadedBytes = 0;
  let lastResponse = null;
  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total) - 1;
    const blob = file.slice(start, end + 1);
    // eslint-disable-next-line no-await-in-loop
    lastResponse = await uploadChunk({
      url,
      blob,
      uploadId,
      start,
      end,
      total,
      onProgress: (loaded) => {
        if (onProgress) {
          onProgress(Math.min(1, (uploadedBytes + loaded) / total));
        }
      },
    });
    uploadedBytes = end + 1;
    // The folder param can be passed on any chunk; pass on the first only
    // for efficiency. Cloudinary returns the final asset metadata on the
    // last successful chunk request.
  }
  // Cloudinary's chunked-upload response only includes the folder when it was
  // sent with the request — we attach it client-side to fold into the asset row.
  return { ...lastResponse, folder };
};

const uploadFiles = async (files, sessionId, fieldKey, formId, onProgress) => {
  const uploaded = [];
  const folder = `leads/${formId || FORM_ID}/${sessionId}/${fieldKey}`;
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    // eslint-disable-next-line no-await-in-loop
    const res = await uploadOneToCloudinary(file, folder, (p) => {
      if (onProgress) onProgress(i, file, p);
    });
    uploaded.push({
      name: file.name,
      size: file.size,
      type: file.type,
      url: res.secure_url,
      path: res.public_id,
      resourceType: res.resource_type,
      format: res.format,
    });
  }
  return uploaded;
};

/* slider helpers */
const sliderDefaults = (item) => {
  if (item.default != null) return item.default;
  if (item.mode === "options") return item.options?.[0] ?? null;
  return Math.round(((item.min ?? 0) + (item.max ?? 100)) / 2);
};
const initialSliderValue = (step) =>
  (step.items || []).reduce((acc, it) => {
    acc[it.key] = sliderDefaults(it);
    return acc;
  }, {});

/* ──────────────────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────────────────── */

// The form is always rendered full-page (mounted by PublicForm at /forms/:slug
// or /apply) — there is no modal/popup mode. A dedicated route is what lets
// Meta Pixel, GA, and URL-based conversion rules actually see the visit.
const ContactForm = ({
  schema,
  formIdOverride,
  formMeta, // optional { tag, source }
  onClose: onCloseProp,
} = {}) => {
  const navigate = useNavigate();

  /* schema-derived constants */
  const effectiveSteps = schema && schema.length > 0 ? schema : STEPS;
  const effectiveFormId = formIdOverride || FORM_ID;
  const effectiveTag = formMeta?.tag || "hoa-lead";
  const effectiveSource = formMeta?.source || "website";
  const effectiveQuestionSteps = effectiveSteps.filter(
    (s) => !["intro", "section", "outro"].includes(s.type),
  );
  /* Each group step bundles N sub-questions onto one page; count those toward
     the total so progress reads "12 / 21", not "12 / 19". */
  const effectiveTotal = effectiveQuestionSteps.reduce((acc, s) => {
    if (s.type === "group") return acc + (s.fields?.length || 0);
    return acc + 1;
  }, 0);

  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [direction, setDirection] = useState("forward");
  /* phoneCC stores an ISO-3166 alpha-2 code ("IN", "US"…). The dial code +
     formatting come from the `PHONE_COUNTRIES` lookup. Legacy saved progress
     used dial codes ("+91") — `findPhoneCountry` accepts both shapes. */
  const [phoneCC, setPhoneCC] = useState(DEFAULT_PHONE_COUNTRY.iso2);
  const [submitState, setSubmitState] = useState("idle"); // idle | saving | saved | error
  const [submitError, setSubmitError] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [resumePrompt, setResumePrompt] = useState(null); // {step, data, phoneCC, savedAt}
  const submittedRef = useRef(false);
  const sessionIdRef = useRef(null);
  const openedLoggedRef = useRef(false);
  const inputRef = useRef(null);

  /* start (or resume) on mount */
  useEffect(() => {
    const saved = loadProgress(effectiveFormId);
    const hasMeaningfulProgress =
      saved && saved.data && Object.keys(saved.data).length > 0;
    sessionIdRef.current = saved?.sessionId || newId();

    if (hasMeaningfulProgress) {
      setResumePrompt(saved);
      return;
    }

    setStep(0);
    setData({});
    setDirection("forward");
    setSubmitState("idle");
    setSubmitError(null);
    setLeadId(null);
    submittedRef.current = false;
    openedLoggedRef.current = false;
    setResumePrompt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFormId]);

  /* fire "opened" once per session */
  useEffect(() => {
    if (!open || resumePrompt) return;
    if (openedLoggedRef.current) return;
    openedLoggedRef.current = true;
    writeFormEvent(
      {
        type: "opened",
        sessionId: sessionIdRef.current,
        utm: readUtmParams(),
        referrer: typeof document !== "undefined" ? document.referrer : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      },
      effectiveFormId,
    );
  }, [open, resumePrompt, effectiveFormId]);

  /* mirror progress to localStorage on every change */
  useEffect(() => {
    if (!open || resumePrompt || submittedRef.current) return;
    saveProgress(
      {
        sessionId: sessionIdRef.current,
        step,
        data,
        phoneCC,
      },
      effectiveFormId,
    );
  }, [open, resumePrompt, step, data, phoneCC, effectiveFormId]);

  /* seed slider defaults the first time a slider step is shown */
  useEffect(() => {
    if (!open || resumePrompt) return;
    const cur = effectiveSteps[step];
    if (cur?.type !== "slider") return;
    setData((d) =>
      d[cur.key] ? d : { ...d, [cur.key]: initialSliderValue(cur) },
    );
    // intentionally exclude `data` from deps so this only fires on step change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resumePrompt, step]);

  /* focus the current step's input shortly after it mounts */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, [open, step]);

  /* submit to Firestore once the user reaches the outro */
  useEffect(() => {
    if (!open) return;
    const cur = effectiveSteps[step];
    if (!cur || cur.type !== "outro") return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    submitLead();
    // submitLead is stable inside the component closure for current data/phoneCC
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  /* Once the lead is actually saved, hand off to the dedicated /thank-you
     route instead of staying on the form URL — a distinct destination is
     what lets Meta/Google Ads conversion actions and analytics goals key off
     the page view, same reasoning as the form itself being a route and not
     a modal. */
  useEffect(() => {
    if (submitState !== "saved") return;
    const cur = effectiveSteps[step];
    if (!cur || cur.type !== "outro") return;
    navigate("/thank-you", {
      state: {
        name: data.name || "",
        leadId,
        whatsappUrl: buildWhatsappUrl(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitState]);

  if (!open) return null;

  const current = effectiveSteps[step];
  const value = current.key ? (data[current.key] ?? "") : "";

  /* derived numbering — count each group sub-field as its own answer position */
  const answersBeforeCurrentStep = (() => {
    let n = 0;
    for (let i = 0; i < step; i += 1) {
      const s = effectiveSteps[i];
      if (!s || ["intro", "section", "outro"].includes(s.type)) continue;
      n += s.type === "group" ? s.fields?.length || 0 : 1;
    }
    return n;
  })();
  const groupSize = current.type === "group" ? current.fields?.length || 0 : 0;
  const questionNumber =
    current.type === "intro" ||
    current.type === "section" ||
    current.type === "outro"
      ? null
      : answersBeforeCurrentStep + 1;
  const questionRangeEnd =
    current.type === "group" ? answersBeforeCurrentStep + groupSize : null;
  const progressCount =
    current.type === "outro"
      ? effectiveTotal
      : current.type === "group"
        ? answersBeforeCurrentStep + groupSize
        : (questionNumber ?? 0);
  const progress =
    current.type === "outro"
      ? 100
      : (progressCount / Math.max(1, effectiveTotal)) * 100;

  /* Section metadata: prefer inline values on the step (schema-driven forms),
     fall back to the SECTIONS map (hardcoded form). */
  const sectionInfo = (() => {
    if (!current.section) return null;
    const fallback = SECTIONS[current.section];
    if (current.type === "section") {
      return {
        num: current.num ?? fallback?.num ?? 0,
        name: current.name || fallback?.name || current.section,
        tagline: current.tagline || fallback?.tagline || "",
      };
    }
    // For non-section steps, we look up via the section step matching the same id
    // so the header chip ("01 · Ambition") works even on schema-driven forms.
    const sectionStep = effectiveSteps.find(
      (s) => s.type === "section" && s.section === current.section,
    );
    if (sectionStep) {
      return {
        num: sectionStep.num ?? fallback?.num ?? 0,
        name: sectionStep.name || fallback?.name || current.section,
        tagline: sectionStep.tagline || fallback?.tagline || "",
      };
    }
    return fallback || null;
  })();

  const sectionsCount = effectiveSteps.filter(
    (s) => s.type === "section",
  ).length;

  /* per-field validation, used by the group renderer too */
  const fieldIsValid = (field, v) => {
    if (field.optional) return true;
    if (field.type === "choice") return Boolean(v);
    if (field.type === "multi") return Array.isArray(v) && v.length > 0;
    if (field.type === "date") return isValidDate(v);
    if (field.type === "time") return Boolean(v);
    if (field.type === "phone")
      return field.required ? isPhone(v, phoneCC) : true;
    if (field.type === "email") return field.required ? isEmail(v) : true;
    if (field.type === "file") {
      if (!field.required) return true;
      return Array.isArray(v) && v.length > 0;
    }
    if (field.type === "slider") return true;
    if (!field.required) return true;
    return Boolean(String(v ?? "").trim());
  };

  /* validation */
  const canAdvance = () => {
    if (current.type === "intro" || current.type === "section") return true;
    if (current.type === "outro") return false;
    if (current.type === "group") {
      return (current.fields || []).every((f) =>
        fieldIsValid(f, data[f.key] ?? ""),
      );
    }
    return fieldIsValid(current, value);
  };

  /* navigation */
  const goNext = () => {
    if (
      !canAdvance() &&
      !current.optional &&
      current.type !== "intro" &&
      current.type !== "section"
    )
      return;
    if (step < effectiveSteps.length - 1) {
      setDirection("forward");
      setStep(step + 1);
    }
  };
  const goPrev = () => {
    if (step > 0) {
      setDirection("backward");
      setStep(step - 1);
    }
  };
  const updateValue = (v) => setData((d) => ({ ...d, [current.key]: v }));
  const handleKey = (e) => {
    if (e.key === "Enter") {
      const isMultiline = current.type === "long" && !(e.metaKey || e.ctrlKey);
      if (isMultiline) return;
      e.preventDefault();
      goNext();
    }
  };
  const handleChoice = (opt) => {
    setData((d) => ({ ...d, [current.key]: opt }));
    setTimeout(() => {
      setDirection("forward");
      setStep((s) => Math.min(s + 1, effectiveSteps.length - 1));
    }, 220);
  };

  const close = () => {
    // If the user closes the form without submitting and has answered ≥1 question,
    // fire a "dropped" analytics event. Progress stays in localStorage for resume.
    if (!submittedRef.current && Object.keys(data).length > 0) {
      writeFormEvent(
        {
          type: "dropped",
          sessionId: sessionIdRef.current,
          lastStep: step,
          lastStepKey: effectiveSteps[step]?.key || effectiveSteps[step]?.type,
          answeredCount: Object.keys(data).length,
          utm: readUtmParams(),
        },
        effectiveFormId,
      );
    }
    if (onCloseProp) {
      onCloseProp();
    } else {
      // This form only ever renders full-page now, so "close" means leave
      // the page — there's no underlying view behind it to fall back to.
      navigate("/");
    }
  };

  const submitLead = () => {
    const payload = {
      // ambition
      categoryStance: data.categoryStance || "",
      problem: data.problem || "",
      motivation: data.motivation || "",
      success24: data.success24 || "",
      perception: data.perception || "",
      // reality
      stage: data.stage || "",
      capital: data.capital || "",
      broken: data.broken || "",
      // thinking
      approach: data.approach || "",
      operate: data.operate || "",
      // alignment
      agencyFit: data.agencyFit || "",
      tanFit: data.tanFit || "",
      // logistics
      name: (data.name || "").trim(),
      email: (data.email || "").trim().toLowerCase(),
      phone: data.phone
        ? `${findPhoneCountry(phoneCC).dial} ${String(data.phone).trim()}`
        : "",
      phoneCountryCode: findPhoneCountry(phoneCC).dial,
      phoneCountryIso: findPhoneCountry(phoneCC).iso2,
      phoneNumber: (data.phone || "").trim(),
      company: (data.company || "").trim(),
      website: (data.website || "").trim(),
      timezone: data.timezone || "",
      callDate: data.callDate || "",
      callTime: data.callTime || "",
      expectations: data.expectations || "",
      // meta
      source: effectiveSource,
      formId: effectiveFormId,
      tag: effectiveTag,
      sessionId: sessionIdRef.current,
      utm: readUtmParams(),
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      submittedAt: serverTimestamp(),
    };

    /* Pull any answers from the schema that aren't already explicitly mapped above
       (handles new questions added via the editor, including group sub-fields). */
    effectiveSteps.forEach((s) => {
      if (s.type === "group") {
        (s.fields || []).forEach((f) => {
          if (!f.key || f.key in payload) return;
          payload[f.key] = data[f.key] ?? null;
        });
        return;
      }
      if (!s.key) return;
      if (s.key in payload) return;
      payload[s.key] = data[s.key] ?? null;
    });

    setSubmitState("saving");
    setSubmitError(null);
    return addDoc(collection(db, "leads"), payload)
      .then((ref) => {
        setLeadId(ref.id);
        setSubmitState("saved");
        clearProgress(effectiveFormId);
        writeFormEvent(
          {
            type: "completed",
            sessionId: sessionIdRef.current,
            leadId: ref.id,
            utm: readUtmParams(),
          },
          effectiveFormId,
        );
        // Fire the actual conversion here (submission succeeded), rather than
        // relying on a URL-based rule — the form lives on its own route now,
        // but a URL match alone can't tell "visited" apart from "converted".
        // trackConversion sends the Pixel event and the server-side
        // Conversions API event under one shared id, so Meta counts one
        // conversion but still sees it when the Pixel is blocked.
        trackConversion({
          eventName: "Lead",
          user: {
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            // Meta matches `country` as a lowercase ISO-3166 alpha-2 code.
            country: findPhoneCountry(phoneCC).iso2,
            externalId: ref.id,
          },
          customData: {
            content_name: effectiveFormId,
            lead_id: ref.id,
            lead_source: effectiveSource,
            tag: effectiveTag,
          },
        });
        if (typeof window !== "undefined" && typeof window.gtag === "function") {
          window.gtag("event", "generate_lead", {
            form_id: effectiveFormId,
            lead_id: ref.id,
          });
        }
      })
      .catch((err) => {
        setSubmitError(err?.message || "Failed to save. Please try again.");
        setSubmitState("error");
        // eslint-disable-next-line no-console
        console.error("[ContactForm] Firestore write failed:", err);
      });
  };

  const retrySubmit = () => {
    submitLead();
  };

  const isLastQuestionStep = (() => {
    // Index of the final non-meta question step in the schema.
    for (let i = effectiveSteps.length - 1; i >= 0; i -= 1) {
      const s = effectiveSteps[i];
      if (s.type !== "outro" && s.type !== "intro" && s.type !== "section") {
        return step === i;
      }
    }
    return false;
  })();

  /* WhatsApp deeplink with all the answers. A hoisted function declaration
     (not a const) so the earlier post-submit effect can reference it. */
  function buildWhatsappUrl() {
    const lines = [
      `Hi HOA — I just submitted the lead form.`,
      ``,
      data.name ? `Name: ${data.name}` : null,
      data.company ? `Company: ${data.company}` : null,
      data.website ? `Website: ${data.website}` : null,
      data.email ? `Email: ${data.email}` : null,
      data.phone
        ? `Phone: ${findPhoneCountry(phoneCC).dial} ${data.phone}`
        : null,
      data.callDate
        ? `Preferred call: ${data.callDate}${data.callTime ? ` ${data.callTime} IST` : ""}`
        : null,
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join("\n"));
    return `https://wa.me/?phone=919266823269&text=${text}`;
  }

  /* header label */
  const headerLabel = (() => {
    if (current.type === "intro") return "Welcome";
    if (current.type === "outro") return "Done";
    if (current.type === "section")
      return `Section ${sectionInfo?.num ?? ""} of ${sectionsCount}`;
    if (current.type === "group" && groupSize > 1)
      return `${questionNumber}-${questionRangeEnd} / ${effectiveTotal}`;
    return `${questionNumber} / ${effectiveTotal}`;
  })();

  /* Resume prompt — shown over a blank dialog when the user has saved progress. */
  if (resumePrompt) {
    const acceptResume = () => {
      setStep(resumePrompt.step ?? 0);
      setData(resumePrompt.data ?? {});
      setPhoneCC(findPhoneCountry(resumePrompt.phoneCC).iso2);
      setDirection("forward");
      setSubmitState("idle");
      setSubmitError(null);
      setLeadId(null);
      submittedRef.current = false;
      setResumePrompt(null);
    };
    const declineResume = () => {
      clearProgress(effectiveFormId);
      sessionIdRef.current = newId();
      openedLoggedRef.current = false;
      setStep(0);
      setData({});
      setPhoneCC(DEFAULT_PHONE_COUNTRY.iso2);
      setDirection("forward");
      setSubmitState("idle");
      setSubmitError(null);
      setLeadId(null);
      submittedRef.current = false;
      setResumePrompt(null);
    };
    const savedAgo = (() => {
      const ms = Date.now() - (resumePrompt.savedAt || Date.now());
      const m = Math.round(ms / 60000);
      if (m < 1) return "just now";
      if (m < 60) return `${m} minutes ago`;
      const h = Math.round(m / 60);
      if (h < 24) return `${h} hours ago`;
      return `${Math.round(h / 24)} days ago`;
    })();
    const answered = Object.keys(resumePrompt.data || {}).length;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resume application"
        className="fixed inset-0 z-[100] bg-[#fafafa] text-black flex items-center justify-center px-5 tf-overlay"
      >
        <div className="max-w-lg w-full">
          <div className="text-[10px] tracking-[0.4em] uppercase font-[helve] text-red-600 mb-4">
            Welcome back
          </div>
          <h2 className="font-[sectra] italic text-3xl sm:text-5xl leading-[1.05] tracking-tight">
            You started this earlier.
          </h2>
          <p className="mt-4 font-[helve] text-[15px] text-black/65 leading-relaxed">
            We saved your last {answered} answer{answered === 1 ? "" : "s"} on
            this device, from {savedAgo}. Pick up where you left off, or start
            over with a clean slate.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={acceptResume}
              className="inline-flex items-center gap-3 rounded-full px-7 py-3 bg-red-600 text-white font-[sectra] italic text-sm font-bold tracking-wide hover:bg-red-700 transition-colors shadow-[0_0_25px_rgba(239,68,68,0.25)]"
            >
              Continue
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              onClick={declineResume}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 border border-black/20 hover:border-black/60 font-[helve] text-sm transition-colors"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="ml-auto text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/45 hover:text-black"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="HOA lead form"
      className="fixed inset-0 z-[100] bg-[#fafafa] text-black flex flex-col tf-overlay"
    >
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between px-5 sm:px-10 py-4 border-b border-black/10 bg-[#fafafa]/90 backdrop-blur">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <div className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-[helve] text-black/55 shrink-0">
            HOA
          </div>
          <span className="hidden sm:block w-px h-3 bg-black/15" />
          <div className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-[helve] text-black/60 truncate">
            {sectionInfo && current.type !== "section" ? (
              <span>
                <span className="text-red-600">0{sectionInfo.num}</span> ·{" "}
                {sectionInfo.name}
              </span>
            ) : (
              <span>Lead form</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-[helve] text-black/55">
            {headerLabel}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close form"
            className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-[helve] text-black hover:opacity-60 transition-opacity inline-flex items-center gap-2"
          >
            <span aria-hidden="true">✕</span>
            <span className="hidden sm:inline">Close</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 border border-black/20 rounded text-[9px] tracking-normal">
              Esc
            </kbd>
          </button>
        </div>
      </div>

      {/* ─── BODY ─── */}
      {/* `safe center` keeps vertical centering when content fits, but falls back
          to `start` when it overflows — without this, tall questions (e.g. the
          multi-select with many options) get their top clipped behind the header
          on large screens and become unreachable on small ones. */}
      <div className="flex-1 flex [align-items:safe_center] justify-center px-5 sm:px-10 overflow-y-auto">
        <div
          key={`step-${step}`}
          className={`w-full max-w-2xl py-12 sm:py-20 ${
            direction === "forward" ? "tf-step-in" : "tf-step-in-back"
          }`}
        >
          {/* ── INTRO ── */}
          {current.type === "intro" && (
            <div className="text-left">
              <div className="text-[10px] tracking-[0.4em] uppercase font-[helve] text-red-600 mb-6">
                Humans of Ambition
              </div>
              <h1 className="font-[sectra] italic text-3xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight text-black whitespace-pre-line">
                {current.title}
              </h1>
              <div className="mt-8 space-y-4 max-w-xl font-[helve] text-[15px] sm:text-base leading-relaxed text-black/70">
                {current.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-8 max-w-xl font-[helve] text-sm text-black/55 italic whitespace-pre-line">
                {current.note}
              </p>
              <button
                type="button"
                onClick={goNext}
                className="mt-12 group inline-flex items-center gap-3 rounded-full px-7 py-3 bg-red-600 text-white font-[sectra] italic text-sm font-bold tracking-wide hover:bg-red-700 transition-colors shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:shadow-[0_0_35px_rgba(239,68,68,0.45)]"
              >
                {current.cta}
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>
              <p className="mt-6 text-[11px] font-[helve] text-black/40">
                ~15 minutes · {effectiveTotal} questions across {sectionsCount}{" "}
                sections
              </p>
            </div>
          )}

          {/* ── SECTION DIVIDER ── */}
          {current.type === "section" && (
            <div className="text-left">
              <div className="text-[10px] tracking-[0.4em] uppercase font-[helve] text-red-600 mb-6">
                Section {sectionInfo?.num ?? ""} of {sectionsCount}
              </div>
              <h2 className="font-[sectra] italic text-5xl sm:text-7xl md:text-8xl leading-[1] text-black">
                {sectionInfo.name}.
              </h2>
              <p className="mt-6 max-w-xl font-[helve] text-lg sm:text-xl text-black/65 leading-snug">
                {sectionInfo.tagline}
              </p>
              <button
                type="button"
                onClick={goNext}
                className="mt-12 group inline-flex items-center gap-3 rounded-full px-7 py-3 bg-black text-white font-[sectra] italic text-sm font-bold tracking-wide hover:bg-red-600 transition-colors"
              >
                Continue
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            </div>
          )}

          {/* ── GROUP (multiple questions on one page) ── */}
          {current.type === "group" && (
            <GroupStep
              step={current}
              data={data}
              setData={setData}
              phoneCC={phoneCC}
              setPhoneCC={setPhoneCC}
              firstQuestionNumber={questionNumber}
              fieldIsValid={fieldIsValid}
              onContinue={goNext}
              canAdvance={canAdvance}
              isLast={isLastQuestionStep}
            />
          )}

          {/* ── QUESTION ── */}
          {current.type !== "intro" &&
            current.type !== "section" &&
            current.type !== "outro" &&
            current.type !== "group" && (
              <>
                <div className="flex items-baseline gap-2 sm:gap-3 mb-6">
                  <span className="font-[sectra] italic text-sm sm:text-base text-red-600 shrink-0">
                    {String(questionNumber).padStart(2, "0")} →
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-[helve] text-2xl sm:text-[34px] md:text-[40px] tracking-tight leading-[1.15] text-black">
                      {current.q}
                      {current.required && !current.optional && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </h2>
                    {current.subtitle && (
                      <p className="font-[helve] text-[14px] sm:text-[15px] text-black/70 mt-3 max-w-xl leading-relaxed">
                        {current.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* text + email */}
                {(current.type === "text" || current.type === "email") && (
                  <input
                    ref={inputRef}
                    type={current.type === "email" ? "email" : "text"}
                    value={value}
                    placeholder={current.placeholder}
                    autoComplete={current.autocomplete || "off"}
                    onChange={(e) => updateValue(e.target.value)}
                    onKeyDown={handleKey}
                    className="w-full bg-transparent border-0 border-b-2 border-black/25 focus:border-red-600 outline-none py-3 text-xl sm:text-2xl md:text-3xl font-[helve] placeholder:text-black/25 transition-colors"
                  />
                )}

                {/* long answer */}
                {current.type === "long" && (
                  <div>
                    <textarea
                      ref={inputRef}
                      value={value}
                      placeholder={current.placeholder}
                      onChange={(e) => updateValue(e.target.value)}
                      onKeyDown={handleKey}
                      maxLength={2400}
                      rows={5}
                      className="w-full bg-transparent border-0 border-b-2 border-black/25 focus:border-red-600 outline-none py-3 text-base sm:text-lg md:text-xl font-[helve] placeholder:text-black/25 transition-colors resize-none"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-[helve] text-black/40">
                      <span>Up to ~300 words.</span>
                      <span>
                        {
                          String(value).trim().split(/\s+/).filter(Boolean)
                            .length
                        }{" "}
                        words
                      </span>
                    </div>
                  </div>
                )}

                {/* phone */}
                {current.type === "phone" && (
                  <PhoneField
                    countryIso={phoneCC}
                    setCountryIso={setPhoneCC}
                    value={value}
                    placeholder={current.placeholder}
                    onValueChange={updateValue}
                    onKeyDown={handleKey}
                    inputRef={inputRef}
                    size="lg"
                  />
                )}

                {/* date */}
                {current.type === "date" && (
                  <input
                    ref={inputRef}
                    type="date"
                    value={value}
                    min={minBookingDate()}
                    onChange={(e) => updateValue(e.target.value)}
                    onKeyDown={handleKey}
                    className="w-full bg-transparent border-0 border-b-2 border-black/25 focus:border-red-600 outline-none py-3 text-xl sm:text-2xl font-[helve] transition-colors"
                  />
                )}

                {/* time */}
                {current.type === "time" && (
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {TIME_SLOTS.map((slot) => {
                      const selected = value === slot;
                      return (
                        <li key={slot}>
                          <button
                            type="button"
                            onClick={() => updateValue(slot)}
                            className={`w-full px-4 py-4 rounded-md border font-[helve] text-base transition-all ${
                              selected
                                ? "border-red-600 bg-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.3)]"
                                : "border-black/20 hover:border-black/60 hover:bg-black/[0.03]"
                            }`}
                          >
                            {slot}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* single choice */}
                {current.type === "choice" && (
                  <ul className="flex flex-col gap-2 sm:gap-3">
                    {current.options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const selected = value === opt;
                      return (
                        <li key={opt}>
                          <button
                            type="button"
                            onClick={() => handleChoice(opt)}
                            className={`group w-full text-left flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 border rounded-md font-[helve] text-base sm:text-[17px] transition-all ${
                              selected
                                ? "border-red-600 bg-red-600/[0.06] text-black"
                                : "border-black/15 hover:border-black/60 hover:bg-black/[0.02]"
                            }`}
                          >
                            <span
                              className={`shrink-0 w-7 h-7 grid place-items-center text-[11px] font-semibold border rounded transition-colors ${
                                selected
                                  ? "border-red-600 text-white bg-red-600"
                                  : "border-black/35 text-black/65 group-hover:border-black/70"
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {selected && (
                              <span
                                className="text-red-600 text-sm"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* multi-select */}
                {current.type === "multi" && (
                  <MultiChoice
                    options={current.options}
                    value={Array.isArray(value) ? value : []}
                    onChange={updateValue}
                  />
                )}

                {/* file upload */}
                {current.type === "file" && (
                  <FileUpload
                    field={current}
                    sessionId={sessionIdRef.current}
                    formId={effectiveFormId}
                    value={Array.isArray(value) ? value : []}
                    onChange={updateValue}
                  />
                )}

                {/* slider (multi-field, EMI-calculator style) */}
                {current.type === "slider" && (
                  <SliderGroup
                    items={current.items || []}
                    value={
                      value &&
                      typeof value === "object" &&
                      !Array.isArray(value)
                        ? value
                        : initialSliderValue(current)
                    }
                    onChange={updateValue}
                  />
                )}

                {/* nav row */}
                <div className="mt-9 sm:mt-12 flex items-center gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canAdvance()}
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-[sectra] italic text-sm font-bold tracking-wide transition-all ${
                      canAdvance()
                        ? "bg-red-600 text-white hover:bg-red-700 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_28px_rgba(239,68,68,0.5)]"
                        : "bg-black/10 text-black/40 cursor-not-allowed"
                    }`}
                  >
                    {isLastQuestionStep
                      ? "Submit"
                      : current.optional && !value
                        ? "Skip"
                        : "OK"}
                    <span aria-hidden="true">→</span>
                  </button>
                  {!["choice", "time", "multi", "file", "slider"].includes(
                    current.type,
                  ) && (
                    <span className="text-[11px] sm:text-xs text-black/45 font-[helve]">
                      press{" "}
                      <kbd className="px-1.5 py-0.5 border border-black/20 rounded text-[10px] font-mono">
                        {current.type === "long" ? "Ctrl + ↵" : "Enter ↵"}
                      </kbd>
                    </span>
                  )}
                  {current.optional && (
                    <span className="text-[11px] font-[helve] text-black/45 italic">
                      Optional
                    </span>
                  )}
                </div>
              </>
            )}

          {/* ── OUTRO ── */}
          {current.type === "outro" && (
            <div className="text-left">
              <div
                className={`inline-flex w-14 h-14 sm:w-16 sm:h-16 rounded-full items-center justify-center text-2xl sm:text-3xl mb-8 transition-all ${
                  submitState === "saved"
                    ? "bg-red-600 text-white shadow-[0_0_28px_rgba(239,68,68,0.45)]"
                    : submitState === "error"
                      ? "bg-black text-white"
                      : "bg-black/10 text-black/40"
                }`}
              >
                {submitState === "saving" ? (
                  <span className="tf-spinner" aria-hidden="true" />
                ) : submitState === "error" ? (
                  "!"
                ) : (
                  "✓"
                )}
              </div>

              <div className="text-[10px] tracking-[0.4em] uppercase font-[helve] text-red-600 mb-4">
                {submitState === "saving"
                  ? "Saving your application…"
                  : submitState === "error"
                    ? "Submission failed"
                    : "Application received"}
              </div>

              <h2 className="font-[sectra] italic text-4xl sm:text-6xl md:text-7xl leading-[1.05] tracking-tight text-black">
                {current.title}
              </h2>
              <div className="mt-6 space-y-2 max-w-xl font-[helve] text-base sm:text-lg text-black/65 leading-relaxed">
                {current.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {submitState === "error" && (
                <div className="mt-6 max-w-xl px-4 py-3 border border-red-600/30 bg-red-600/[0.05] rounded-md">
                  <p className="font-[helve] text-sm text-black/75">
                    We couldn't save your application.
                  </p>
                  {submitError && (
                    <p className="mt-1 font-[helve] text-xs text-black/55 break-all">
                      {submitError}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-10 flex flex-wrap items-center gap-4">
                {submitState === "saved" && (
                  <a
                    href={buildWhatsappUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-3 rounded-full px-7 py-3 bg-[#25D366] text-white font-[sectra] italic text-sm font-bold tracking-wide hover:brightness-110 transition shadow-[0_0_25px_rgba(37,211,102,0.35)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 fill-current"
                      aria-hidden="true"
                    >
                      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.86 11.86 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.555-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.598-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.881.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.881a9.86 9.86 0 0 0 1.514 5.273l-.999 3.648 3.974-1.621z" />
                    </svg>
                    Chat on WhatsApp
                  </a>
                )}

                {submitState === "error" && (
                  <button
                    type="button"
                    onClick={retrySubmit}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 bg-red-600 text-white font-[sectra] italic text-sm font-bold tracking-wide hover:bg-red-700 transition shadow-[0_0_22px_rgba(239,68,68,0.3)]"
                  >
                    Try again →
                  </button>
                )}

                {submitState === "saving" && (
                  <span className="inline-flex items-center gap-3 rounded-full px-6 py-3 bg-black/[0.06] font-[helve] text-sm text-black/55">
                    <span className="tf-spinner-sm" aria-hidden="true" />
                    Saving…
                  </span>
                )}

                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 border border-black/20 hover:border-black/60 font-[helve] text-sm transition-colors"
                >
                  Close
                </button>
              </div>

              <p className="mt-8 text-[11px] tracking-[0.3em] uppercase font-[helve] text-black/45">
                {submitState === "saved" && leadId
                  ? `Ref: ${leadId.slice(0, 8)} · we typically respond within 24 hours.`
                  : "We typically respond within 24 hours."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── FOOTER + PROGRESS ─── */}
      <div className="border-t border-black/10 bg-[#fafafa]/90 backdrop-blur">
        <div className="h-1 bg-black/[0.06]">
          <div
            className="h-full bg-red-600 transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-5 sm:px-10 py-3 gap-4">
          <div className="text-[10px] sm:text-xs tracking-[0.3em] uppercase font-[helve] text-black/55 truncate">
            {current.type === "outro"
              ? "Application complete"
              : current.type === "intro"
                ? "Begin when ready"
                : `${Math.round(progress)}% complete`}
          </div>
          {current.type !== "outro" && current.type !== "intro" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 0}
                aria-label="Previous question"
                className={`w-12 font-[helve] h-8 grid place-items-center rounded border transition-colors ${
                  step === 0
                    ? "border-black/10 text-black/20 cursor-not-allowed"
                    : "border-black/30 text-black hover:bg-black hover:text-white"
                }`}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance() && current.type !== "section"}
                aria-label="Next question"
                className={`w-12 font-[helve] h-8 grid place-items-center rounded border transition-colors ${
                  !canAdvance() && current.type !== "section"
                    ? "border-black/10 text-black/20 cursor-not-allowed"
                    : "border-black/30 text-black hover:bg-black hover:text-white"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tfOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tfStepIn {
          from { transform: translateY(28px); opacity: 0; filter: blur(4px); }
          to   { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes tfStepInBack {
          from { transform: translateY(-28px); opacity: 0; filter: blur(4px); }
          to   { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        .tf-overlay { animation: tfOverlayIn 260ms ease-out; }
        .tf-step-in { animation: tfStepIn 520ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        .tf-step-in-back { animation: tfStepInBack 520ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.55; }
        @keyframes tfSpin { to { transform: rotate(360deg); } }
        .tf-spinner {
          width: 26px; height: 26px; border-radius: 9999px;
          border: 2.5px solid rgba(0,0,0,0.15); border-top-color: #dc2626;
          animation: tfSpin 0.8s linear infinite;
        }
        .tf-spinner-sm {
          width: 14px; height: 14px; border-radius: 9999px;
          border: 2px solid rgba(0,0,0,0.15); border-top-color: #dc2626;
          animation: tfSpin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Group step — renders multiple question fields on one page.
   Authored from the CMS as { type: "group", title, subtitle, fields: [...] }.
   ────────────────────────────────────────────────────────────────────────── */
function GroupStep({
  step,
  data,
  setData,
  phoneCC,
  setPhoneCC,
  firstQuestionNumber,
  fieldIsValid,
  onContinue,
  canAdvance,
  isLast,
}) {
  const fields = step.fields || [];
  const setField = (key, v) => setData((d) => ({ ...d, [key]: v }));
  return (
    <div>
      {(step.title || step.q) && (
        <div className="flex items-baseline gap-2 sm:gap-3 mb-7 sm:mb-9">
          <span className="font-[sectra] italic text-sm sm:text-base text-red-600 shrink-0">
            {String(firstQuestionNumber || 1).padStart(2, "0")} →
          </span>
          <div className="min-w-0">
            <h2 className="font-[helve] text-2xl sm:text-[34px] md:text-[40px] tracking-tight leading-[1.15] text-black">
              {step.title || step.q}
            </h2>
            {step.subtitle && (
              <p className="font-[helve] text-[14px] sm:text-[15px] text-black/70 mt-3 max-w-xl leading-snug">
                {step.subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-7 sm:space-y-9">
        {fields.map((f, idx) => (
          <GroupField
            key={f.key || idx}
            field={f}
            number={(firstQuestionNumber || 1) + idx}
            value={data[f.key] ?? ""}
            onChange={(v) => setField(f.key, v)}
            phoneCC={phoneCC}
            setPhoneCC={setPhoneCC}
          />
        ))}
      </div>

      <div className="mt-10 sm:mt-12 flex items-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canAdvance()}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-[sectra] italic text-sm font-bold tracking-wide transition-all ${
            canAdvance()
              ? "bg-red-600 text-white hover:bg-red-700 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_28px_rgba(239,68,68,0.5)]"
              : "bg-black/10 text-black/40 cursor-not-allowed"
          }`}
        >
          {isLast ? "Submit" : "OK"}
          <span aria-hidden="true">→</span>
        </button>
        {!canAdvance() && (
          <span className="text-[11px] font-[helve] text-black/45 italic">
            Please fill all required fields above.
          </span>
        )}
      </div>
    </div>
  );
}

function GroupField({ field, number, value, onChange, phoneCC, setPhoneCC }) {
  const showStar = field.required && !field.optional;
  const label = (
    <div className="flex items-baseline gap-2 sm:gap-3 mb-3">
      <span className="font-[sectra] italic text-xs sm:text-sm text-red-600 shrink-0">
        {String(number).padStart(2, "0")} →
      </span>
      <div className="min-w-0">
        <h3 className="font-[helve] text-base sm:text-lg md:text-xl tracking-tight leading-snug text-black">
          {field.q || ""}
          {showStar && <span className="text-red-600 ml-1">*</span>}
        </h3>
        {field.subtitle && (
          <p className="font-[helve] text-[13px] sm:text-[14px] text-black/70 mt-2 max-w-xl leading-snug">
            {field.subtitle}
          </p>
        )}
      </div>
    </div>
  );
  const subtitle = null;

  if (field.type === "text" || field.type === "email") {
    return (
      <div>
        {label}
        {subtitle}
        <input
          type={field.type === "email" ? "email" : "text"}
          value={value}
          placeholder={field.placeholder}
          autoComplete={field.autocomplete || "off"}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-0 border-b-2 border-black/25 focus:border-red-600 outline-none py-2.5 text-lg sm:text-xl font-[helve] placeholder:text-black/25 transition-colors"
        />
      </div>
    );
  }
  if (field.type === "long") {
    return (
      <div>
        {label}
        {subtitle}
        <textarea
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2400}
          rows={3}
          className="w-full bg-transparent border-0 border-b-2 border-black/25 focus:border-red-600 outline-none py-2.5 text-base sm:text-lg font-[helve] placeholder:text-black/25 transition-colors resize-none"
        />
        <div className="mt-1 text-[11px] font-[helve] text-black/40">
          {String(value).trim().split(/\s+/).filter(Boolean).length} words
        </div>
      </div>
    );
  }
  if (field.type === "phone") {
    return (
      <div>
        {label}
        {subtitle}
        <PhoneField
          countryIso={phoneCC}
          setCountryIso={setPhoneCC}
          value={value}
          placeholder={field.placeholder}
          onValueChange={onChange}
          size="md"
        />
      </div>
    );
  }
  if (field.type === "date") {
    return (
      <div>
        {label}
        {subtitle}
        <input
          type="date"
          value={value}
          min={minBookingDate()}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-0 border-b-2 border-black/25 focus:border-red-600 outline-none py-2.5 text-lg sm:text-xl font-[helve] transition-colors"
        />
      </div>
    );
  }
  if (field.type === "time") {
    return (
      <div>
        {label}
        {subtitle}
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {TIME_SLOTS.map((slot) => {
            const selected = value === slot;
            return (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() => onChange(slot)}
                  className={`w-full px-4 py-3 rounded-md border font-[helve] text-sm sm:text-base transition-all ${
                    selected
                      ? "border-red-600 bg-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.3)]"
                      : "border-black/20 hover:border-black/60 hover:bg-black/[0.03]"
                  }`}
                >
                  {slot}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  if (field.type === "choice") {
    return (
      <div>
        {label}
        {subtitle}
        <ul className="flex flex-col gap-2">
          {(field.options || []).map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const selected = value === opt;
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => onChange(opt)}
                  className={`group w-full text-left flex items-center gap-3 px-4 py-3 border rounded-md font-[helve] text-[15px] transition-all ${
                    selected
                      ? "border-red-600 bg-red-600/[0.06] text-black"
                      : "border-black/15 hover:border-black/60 hover:bg-black/[0.02]"
                  }`}
                >
                  <span
                    className={`shrink-0 w-6 h-6 grid place-items-center text-[10px] font-semibold border rounded transition-colors ${
                      selected
                        ? "border-red-600 text-white bg-red-600"
                        : "border-black/35 text-black/65"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {selected && (
                    <span className="text-red-600 text-sm" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  if (field.type === "multi") {
    return (
      <div>
        {label}
        {subtitle}
        <MultiChoice
          options={field.options || []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      </div>
    );
  }
  return (
    <div className="text-[12px] text-black/50 italic">
      Unsupported field type "{field.type}" inside group.
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Multi-select question
   ────────────────────────────────────────────────────────────────────────── */
function MultiChoice({ options, value, onChange }) {
  const toggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };
  return (
    <ul className="flex flex-col gap-2 sm:gap-3">
      {options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const selected = value.includes(opt);
        return (
          <li key={opt}>
            <button
              type="button"
              onClick={() => toggle(opt)}
              className={`group w-full text-left flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 border rounded-md font-[helve] text-base sm:text-[17px] transition-all ${
                selected
                  ? "border-red-600 bg-red-600/[0.06] text-black"
                  : "border-black/15 hover:border-black/60 hover:bg-black/[0.02]"
              }`}
            >
              <span
                className={`shrink-0 w-7 h-7 grid place-items-center text-[11px] font-semibold border-2 transition-colors ${
                  selected
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-black/35 text-black/65 group-hover:border-black/70"
                }`}
                style={{ borderRadius: 6 }}
                aria-hidden="true"
              >
                {selected ? "✓" : letter}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          </li>
        );
      })}
      <li className="text-[11px] font-[helve] text-black/45 mt-1">
        {value.length} selected · pick all that apply
      </li>
    </ul>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Phone field — international country picker with per-country formatting.

   The country dropdown is rendered as a custom popover (not a native <select>)
   so we can show flags and dial codes together, support quick search, and
   keep the underline-style input the form uses elsewhere. The local number
   input shows a per-country example as placeholder and caps the length at
   the country's max digit count so users see length issues immediately.
   ────────────────────────────────────────────────────────────────────────── */
function PhoneField({
  countryIso,
  setCountryIso,
  value,
  placeholder,
  onValueChange,
  onKeyDown,
  inputRef,
  size = "md",
}) {
  const country = findPhoneCountry(countryIso);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  const filtered = !query
    ? PHONE_COUNTRIES
    : PHONE_COUNTRIES.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.dial.replace("+", "").startsWith(q.replace("+", "")) ||
          c.iso2.toLowerCase() === q
        );
      });

  const inputSize =
    size === "lg"
      ? "py-3 text-xl sm:text-2xl md:text-3xl"
      : "py-2.5 text-lg sm:text-xl";
  const ccSize =
    size === "lg" ? "py-3 text-xl sm:text-2xl" : "py-2.5 text-lg sm:text-xl";

  const handleLocalChange = (raw) => {
    // Keep digits + a few formatter characters; cap at the country's max length.
    const cleaned = raw.replace(/[^0-9\s\-()]/g, "");
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length <= country.max) onValueChange(cleaned);
    else {
      // Truncate while preserving any trailing separators the user typed.
      let kept = 0;
      let out = "";
      for (const ch of cleaned) {
        if (/\d/.test(ch)) {
          if (kept >= country.max) break;
          kept += 1;
        }
        out += ch;
      }
      onValueChange(out);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex items-stretch gap-3 border-b-2 border-black/25 focus-within:border-red-600 transition-colors">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          className={`shrink-0 inline-flex items-center gap-2 ${ccSize} font-[helve] outline-none cursor-pointer`}
        >
          <span className="text-2xl leading-none">{country.flag}</span>
          <span>{country.dial}</span>
          <span aria-hidden="true" className="text-black/40 text-sm">
            ▾
          </span>
        </button>
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          value={value}
          placeholder={placeholder || country.example}
          autoComplete="tel-national"
          onChange={(e) => handleLocalChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={`flex-1 bg-transparent border-0 outline-none ${inputSize} font-[helve] placeholder:text-black/25`}
        />
      </div>
      <div className="mt-1.5 text-[11px] font-[helve] text-black/45">
        {country.name} ·{" "}
        {country.min === country.max
          ? `${country.min} digits`
          : `${country.min}–${country.max} digits`}{" "}
        · e.g. {country.example}
      </div>

      {pickerOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-hidden rounded-lg border border-black/15 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.15)]">
          <div className="p-2 border-b border-black/10 bg-white">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code…"
              className="w-full px-3 py-2 text-sm font-[helve] outline-none border border-black/15 rounded focus:border-red-600"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto" role="listbox">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-black/50 font-[helve]">
                No countries match "{query}".
              </li>
            )}
            {filtered.map((c) => (
              <li key={c.iso2}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.iso2 === country.iso2}
                  onClick={() => {
                    setCountryIso(c.iso2);
                    setPickerOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-[helve] hover:bg-black/[0.04] ${
                    c.iso2 === country.iso2 ? "bg-red-600/[0.06]" : ""
                  }`}
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-black/55 tabular-nums">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   File upload — Firebase Storage
   ────────────────────────────────────────────────────────────────────────── */
function FileUpload({ field, sessionId, formId, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    setError(null);
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    if (field.maxMB) {
      const max = field.maxMB * 1024 * 1024;
      const tooBig = files.find((f) => f.size > max);
      if (tooBig) {
        setError(`"${tooBig.name}" exceeds the ${field.maxMB} MB limit.`);
        return;
      }
    }
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadFiles(
        files,
        sessionId,
        field.key,
        formId,
        (i, _f, p) => {
          const overall = (i + p) / files.length;
          setProgress(Math.round(overall * 100));
        },
      );
      onChange(field.multiple ? [...value, ...uploaded] : uploaded);
    } catch (e) {
      console.error("[FileUpload]", e);
      setError(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const formatSize = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="group relative flex flex-col items-center justify-center text-center border-2 border-dashed border-black/25 hover:border-red-600 rounded-lg px-6 py-10 cursor-pointer bg-white/40 hover:bg-white transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          multiple={!!field.multiple}
          accept={field.accept || ""}
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
        <div className="font-[sectra] italic text-xl text-black/80">
          {uploading
            ? `Uploading… ${progress}%`
            : field.multiple
              ? "Drop files or click to upload"
              : "Drop a file or click to upload"}
        </div>
        <div className="mt-2 text-[11px] font-[helve] text-black/45">
          {field.accept ? `Accepted: ${field.accept}` : "Any file type"}
          {field.maxMB ? ` · max ${field.maxMB} MB each` : ""}
        </div>
        {uploading && (
          <div className="mt-4 w-full max-w-xs h-1 bg-black/10 rounded">
            <div
              className="h-full bg-red-600 rounded transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </label>

      {error && (
        <div className="mt-3 px-3 py-2 border border-red-600/30 bg-red-600/[0.06] rounded text-[12px] font-[helve] text-red-700">
          {error}
        </div>
      )}

      {value.length > 0 && (
        <ul className="mt-4 space-y-2">
          {value.map((f, i) => (
            <li
              key={f.path || `${f.name}-${i}`}
              className="flex items-center gap-3 px-3 py-2 border border-black/15 rounded-md bg-white"
            >
              <span
                className="text-red-600 text-sm shrink-0"
                aria-hidden="true"
              >
                ✓
              </span>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-[helve] text-[14px] hover:underline"
              >
                {f.name}
              </a>
              <span className="text-[11px] font-[helve] text-black/45 shrink-0">
                {formatSize(f.size || 0)}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="text-[11px] font-[helve] text-black/45 hover:text-red-600 shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Slider group — multiple sliders, EMI-calculator style
   Each item: { key, label, mode: "number"|"options", ...params, default }
   ────────────────────────────────────────────────────────────────────────── */
function SliderGroup({ items, value, onChange }) {
  const setItem = (k, v) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-7">
      {items.map((it) => {
        if (it.mode === "options") {
          const opts = it.options || [];
          const idx = Math.max(0, opts.indexOf(value[it.key] ?? opts[0]));
          return (
            <div key={it.key}>
              <div className="flex items-baseline justify-between mb-2">
                <label className="font-[helve] text-[14px] sm:text-[15px] text-black/80">
                  {it.label}
                </label>
                <span className="font-[sectra] italic text-base sm:text-lg text-red-600">
                  {opts[idx] ?? "—"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, opts.length - 1)}
                step={1}
                value={idx}
                onChange={(e) => setItem(it.key, opts[Number(e.target.value)])}
                className="tf-range w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] font-[helve] text-black/45">
                {opts.map((o) => (
                  <span key={o} className="truncate max-w-[90px]">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          );
        }
        // numeric
        const v = value[it.key] ?? it.default ?? it.min ?? 0;
        return (
          <div key={it.key}>
            <div className="flex items-baseline justify-between mb-2">
              <label className="font-[helve] text-[14px] sm:text-[15px] text-black/80">
                {it.label}
              </label>
              <span className="font-[sectra] italic text-base sm:text-lg text-red-600">
                {v}
                {it.unit ? ` ${it.unit}` : ""}
              </span>
            </div>
            <input
              type="range"
              min={it.min ?? 0}
              max={it.max ?? 100}
              step={it.step ?? 1}
              value={v}
              onChange={(e) => setItem(it.key, Number(e.target.value))}
              className="tf-range w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] font-[helve] text-black/45">
              <span>
                {it.min ?? 0}
                {it.unit ? ` ${it.unit}` : ""}
              </span>
              <span>
                {it.max ?? 100}
                {it.unit ? ` ${it.unit}` : ""}
              </span>
            </div>
          </div>
        );
      })}
      <style>{`
        .tf-range {
          -webkit-appearance: none; appearance: none;
          height: 4px; background: rgba(0,0,0,0.12); border-radius: 9999px; outline: none;
        }
        .tf-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 9999px;
          background: #dc2626; border: 3px solid #fff;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 0 14px rgba(239,68,68,0.45);
          cursor: pointer;
        }
        .tf-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 9999px;
          background: #dc2626; border: 3px solid #fff;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 0 14px rgba(239,68,68,0.45);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default ContactForm;
