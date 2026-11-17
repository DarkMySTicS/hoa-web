import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase";
import ContactForm from "../components/ContactForm";

/**
 * Public form route — /forms/:slug (also mounted at /apply with a fixed
 * `slug` prop, which is the canonical link every on-site CTA now points to).
 *
 * Reads the matching `forms` doc from Firestore, then renders the form in
 * full-page mode using the shared <ContactForm/> renderer.
 *
 * If no `forms` doc has questions stored yet (the slug exists but the schema
 * hasn't been pushed from the CMS editor), we render with a `null` schema so
 * <ContactForm/> falls back to its hardcoded default — that way the
 * canonical lead-form URL works out of the box.
 *
 * If the slug doesn't resolve to any form at all, we look up whichever form
 * is currently marked `main: true` in the CRM and render it instead. That
 * lets the public lead-form URL stay stable even when the CRM swaps which
 * form is "main" — historically that was hardcoded to "hoa-lead-form-v1".
 */
const MAIN_FALLBACK_SLUG = "hoa-lead-form-v1";

async function resolveMainFormFallback() {
  const explicit = await getDocs(
    query(collection(db, "forms"), where("main", "==", true), limit(1)),
  );
  if (!explicit.empty) {
    const d = explicit.docs[0];
    return { id: d.id, ...d.data() };
  }
  const legacy = await getDocs(
    query(
      collection(db, "forms"),
      where("slug", "==", MAIN_FALLBACK_SLUG),
      limit(1),
    ),
  );
  if (!legacy.empty) {
    const d = legacy.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
}

const PublicForm = ({ slug: slugProp } = {}) => {
  const params = useParams();
  const slug = slugProp || params.slug;
  const [state, setState] = useState({
    status: "loading",
    form: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ status: "loading", form: null, error: null });
      try {
        const q = query(
          collection(db, "forms"),
          where("slug", "==", slug),
          limit(1),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          // No record at the requested slug — try the configured main form.
          const main = await resolveMainFormFallback();
          if (cancelled) return;
          if (main) {
            setState({ status: "ok", form: main });
            return;
          }
          // Last-resort fallback so the canonical URL still renders something
          // even on a brand-new install with no forms seeded.
          if (slug === MAIN_FALLBACK_SLUG) {
            setState({
              status: "ok",
              form: {
                slug,
                name: "Main form",
                tag: "hoa-lead",
                status: "active",
              },
            });
            return;
          }
          setState({ status: "not-found", form: null });
          return;
        }
        const d = snap.docs[0];
        const form = { id: d.id, ...d.data() };
        if (form.status === "archived") {
          setState({ status: "archived", form });
          return;
        }
        setState({ status: "ok", form });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[PublicForm] load failed", e);
        if (cancelled) return;
        setState({
          status: "error",
          form: null,
          error: e?.message || String(e),
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return <CenterMessage title="Loading form…" />;
  }
  if (state.status === "not-found") {
    return (
      <CenterMessage
        title="Form not found."
        body={`No form is published at /forms/${slug}.`}
        actions={
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 border border-black/20 hover:border-black/60 font-[helve] text-sm transition-colors"
          >
            Back to home
          </Link>
        }
      />
    );
  }
  if (state.status === "archived") {
    return (
      <CenterMessage
        title="This form is closed."
        body="Applications for this round are no longer being accepted."
      />
    );
  }
  if (state.status === "error") {
    return (
      <CenterMessage title="Couldn't load this form." body={state.error} />
    );
  }

  const f = state.form;
  const schema = f.questions && f.questions.length > 0 ? f.questions : null;

  return (
    <ContactForm
      mode="page"
      schema={schema}
      formIdOverride={f.slug}
      formMeta={{ tag: f.tag || "", source: f.source || "website" }}
    />
  );
};

function CenterMessage({ title, body, actions }) {
  return (
    <div className="fixed inset-0 bg-[#fafafa] text-black flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <div className="text-[10px] tracking-[0.4em] uppercase font-[helve] text-red-600 mb-4">
          Humans of Ambition
        </div>
        <h1 className="font-[sectra] italic text-3xl sm:text-5xl leading-[1.05] tracking-tight">
          {title}
        </h1>
        {body && (
          <p className="mt-4 font-[helve] text-[15px] text-black/65 leading-relaxed break-words">
            {body}
          </p>
        )}
        {actions && <div className="mt-8">{actions}</div>}
      </div>
    </div>
  );
}

export default PublicForm;
