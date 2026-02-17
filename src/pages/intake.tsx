import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type StartResp =
  | {
      status: "PENDING";
      requestId: string;
      planKey?: string | null;
      planName?: string | null;
    }
  | { status: "SUBMITTED"; requestId: string }
  | { status: "INVALID"; requestId: string }
  | { status: "ERROR"; requestId?: string; details?: string };

function safeJsonParse(text: string) {
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type PersonPayload = {
  fullName: string;
  dob: string;
  phone: string;
  address: string;
};

export default function IntakeIndividualPage() {
  const router = useRouter();
  const code = typeof router.query.code === "string" ? router.query.code : "";

  const [state, setState] = useState<
    "loading" | "pending" | "submitted" | "invalid" | "error"
  >("loading");

  const [msg, setMsg] = useState("");

  // Optional: show plan info if returned (helps debugging during rollout)
  const [planKey, setPlanKey] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);

  // Person 1 (required)
  const [p1FullName, setP1FullName] = useState("");
  const [p1Dob, setP1Dob] = useState("");
  const [p1Phone, setP1Phone] = useState("");
  const [p1Address, setP1Address] = useState("");

  // ✅ Authorization + signature (Individual = 1 signature)
  const [authAccepted, setAuthAccepted] = useState(false);
  const [sig1Name, setSig1Name] = useState("");
  const [sig1DateLocal, setSig1DateLocal] = useState(() =>
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  );

  const person1Ok = useMemo(() => {
    return (
      p1FullName.trim() && p1Dob.trim() && p1Phone.trim() && p1Address.trim()
    );
  }, [p1FullName, p1Dob, p1Phone, p1Address]);

  const authorizationOk = useMemo(() => {
    return authAccepted && sig1Name.trim().length > 0;
  }, [authAccepted, sig1Name]);

  const canSubmit = person1Ok && authorizationOk;

  useEffect(() => {
    // keep date current if they leave the page open overnight etc.
    const id = setInterval(() => {
      setSig1DateLocal(
        new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      );
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!code) return;

    const check = async () => {
      setState("loading");
      setMsg("");
      setPlanKey(null);
      setPlanName(null);

      try {
        const res = await fetch("/api/intake/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const text = await res.text().catch(() => "");
        const data = safeJsonParse(text) as StartResp | null;

        if (!data) {
          setState("error");
          setMsg(
            `API returned non-JSON/empty body. HTTP ${res.status}. ` +
              (text ? `Body: ${text.slice(0, 300)}` : "Body was empty.")
          );
          return;
        }

        if (data.status === "PENDING") {
          const pk = typeof data.planKey === "string" ? data.planKey : null;
          const pn = typeof data.planName === "string" ? data.planName : null;

          setPlanKey(pk);
          setPlanName(pn);

          // ✅ If they bought PAIR, send them to the pair form automatically
          if (pk === "firstflame_pair") {
            router.replace(`/intake-pair?code=${encodeURIComponent(code)}`);
            return;
          }

          setState("pending");
          return;
        }

        if (data.status === "SUBMITTED") return setState("submitted");

        if (data.status === "INVALID") {
          setState("invalid");
          setMsg("This intake link is invalid or expired.");
          return;
        }

        setState("error");
        setMsg(data.details || `Server error. HTTP ${res.status}`);
      } catch (err: any) {
        setState("error");
        setMsg(err?.message || "Network error.");
      }
    };

    check();
  }, [code, router]);

  const submit = async () => {
    setMsg("");

    // You want the server to record IP/user-agent/time; this client timestamp is still useful for UX/audit.
    const signedAtISO = new Date().toISOString();

    const person1: PersonPayload = {
      fullName: p1FullName.trim(),
      dob: p1Dob.trim(),
      phone: p1Phone.trim(),
      address: p1Address.trim(),
    };

    const payload = {
      person1,
      authorization: {
        version: "ng-auth-v1",
        accepted: true,
        signedAtISO,
        jurisdiction: "CA",
        person1: {
          signatureName: sig1Name.trim(),
          signatureType: "typed",
        },
      },
    };

    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, payload }),
      });

      const text = await res.text().catch(() => "");
      const data = safeJsonParse(text) as any;

      if (!data) {
        setMsg(
          `Submit returned non-JSON/empty body. HTTP ${res.status}. ` +
            (text ? `Body: ${text.slice(0, 300)}` : "Body was empty.")
        );
        return;
      }

      if (data.status === "SUBMITTED" || data.status === "ALREADY_SUBMITTED") {
        setState("submitted");
        return;
      }

      // ✅ helpful if we implement server-side plan enforcement (403 w/ status)
      if (res.status === 403) {
        setMsg("Submit blocked: your plan does not allow this intake payload.");
        return;
      }

      // ✅ if you enforce signatures server-side, return 400 with details; surface it
      if (res.status === 400 && data.details) {
        setMsg(String(data.details));
        return;
      }

      setMsg(`Submit failed: ${data.status || "ERROR"}`);
    } catch (err: any) {
      setMsg(err?.message || "Network error.");
    }
  };

  return (
    <main
      className="
        min-h-screen
        bg-[#171710]
        bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        text-[#E3DAC9]
      "
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#1F3B1D]/55 via-transparent to-[#171710] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-2xl px-6 sm:px-10 py-14">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight drop-shadow-[0_0_12px_rgba(255,191,0,0.12)]">
            <span className="block text-[#FFBF00]">Secure Intake</span>
            <span className="block">First Flame: Individual</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#E3DAC9]/80">
            This link is single-use. Complete it once, then we begin the hunt.
          </p>

          {(planKey || planName) && (
            <p className="mt-3 text-xs text-[#E3DAC9]/55">
              Plan:{" "}
              <span className="text-[#E3DAC9]/80">{planName || planKey}</span>
            </p>
          )}
        </div>

        <div className="mt-10 rounded-2xl border border-[#1F3B1D]/70 bg-[#0f0f0b]/40 backdrop-blur-sm shadow-[0_0_18px_rgba(31,59,29,0.20)] overflow-hidden">
          <div className="px-6 sm:px-8 py-6 border-b border-[#1F3B1D]/60">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-[#E3DAC9]/75">
                Status:{" "}
                <span className="font-semibold text-[#E3DAC9]">
                  {state === "loading" && "Verifying"}
                  {state === "pending" && "Verified"}
                  {state === "submitted" && "Submitted"}
                  {state === "invalid" && "Invalid"}
                  {state === "error" && "Error"}
                </span>
              </div>

              <div
                className={cx(
                  "text-xs font-semibold px-3 py-1 rounded-full border",
                  state === "pending" &&
                    "border-[#FFBF00]/40 text-[#FFBF00] bg-[#171710]/40",
                  state === "loading" &&
                    "border-[#1F3B1D]/70 text-[#E3DAC9]/70 bg-[#171710]/30",
                  (state === "invalid" || state === "error") &&
                    "border-red-400/40 text-red-200 bg-[#171710]/30",
                  state === "submitted" &&
                    "border-emerald-300/40 text-emerald-200 bg-[#171710]/30"
                )}
              >
                {state === "loading" && "Checking link…"}
                {state === "pending" && "Secure link verified"}
                {state === "submitted" && "Complete"}
                {state === "invalid" && "Expired"}
                {state === "error" && "Attention"}
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-8">
            {state === "loading" && (
              <p className="text-[#E3DAC9]/80">Checking your secure link…</p>
            )}

            {state === "invalid" && (
              <div className="space-y-3">
                <p className="font-semibold text-red-200">Invalid link</p>
                <p className="text-[#E3DAC9]/80">{msg}</p>
              </div>
            )}

            {state === "error" && (
              <div className="space-y-3">
                <p className="font-semibold text-red-200">Error</p>
                <p className="text-sm text-[#E3DAC9]/80 whitespace-pre-wrap">
                  {msg}
                </p>
              </div>
            )}

            {state === "submitted" && (
              <div className="space-y-3">
                <p className="font-semibold text-emerald-200">Submitted</p>
                <p className="text-[#E3DAC9]/80">
                  Your intake is complete. We’ll begin the hunt.
                </p>

                <div className="mt-4 rounded-xl border border-[#1F3B1D]/60 bg-[#171710]/25 px-4 py-3 text-sm text-[#E3DAC9]/75">
                  If you need changes, reply to your confirmation email and we’ll
                  secure an update path.
                </div>
              </div>
            )}

            {state === "pending" && (
              <div className="space-y-6">
                <p className="text-sm text-[#E3DAC9]/80">
                  Enter your information exactly as it appears on your legal
                  documents. This helps us match and remove broker records.
                </p>

                <Section title="Person 1 (Required)">
                  <Field
                    label="Full legal name"
                    value={p1FullName}
                    onChange={setP1FullName}
                    placeholder="First Middle Last"
                  />
                  <Field
                    label="Date of birth"
                    value={p1Dob}
                    onChange={setP1Dob}
                    placeholder="MM-DD-YYYY"
                  />
                  <Field
                    label="Phone"
                    value={p1Phone}
                    onChange={setP1Phone}
                    placeholder="(555) 555-5555"
                  />
                  <Field
                    label="Address"
                    value={p1Address}
                    onChange={setP1Address}
                    placeholder="Street, City, State ZIP"
                  />
                </Section>

                {/* ✅ NEW: Authorization block */}
                <Section
                  title="Authorized Agent Designation & Signature (Required)"
                  subtitle={`Date: ${sig1DateLocal}`}
                >
                  <div className="rounded-xl border border-[#1F3B1D]/60 bg-[#171710]/25 p-4 text-sm text-[#E3DAC9]/80 leading-relaxed">
                    <p className="m-0">
                      By signing below, I authorize <strong>NetGoblin</strong> to
                      act as my <strong>authorized agent</strong> to submit privacy
                      requests on my behalf, including requests to access, delete,
                      correct, suppress, and opt out of the sale or sharing of my
                      personal information with data brokers, people-search sites,
                      marketing databases, and other entities that may hold my
                      personal information.
                    </p>

                    <ul className="mt-3 mb-0 pl-5 space-y-1 text-[#E3DAC9]/75">
                      <li>
                        I understand that some organizations may ask to verify my
                        identity and/or confirm that I granted this permission.
                      </li>
                      <li>
                        I affirm the information I submit is accurate to the best
                        of my knowledge.
                      </li>
                      <li>
                        I consent to the use of electronic signatures and agree
                        that my typed signature is legally binding.
                      </li>
                      <li>
                        This authorization remains effective until I revoke it in
                        writing.
                      </li>
                    </ul>
                  </div>

                  <label className="flex items-start gap-3 select-none">
                    <input
                      type="checkbox"
                      checked={authAccepted}
                      onChange={(e) => setAuthAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#FFBF00]"
                    />
                    <span className="text-sm text-[#E3DAC9]/80">
                      I agree and authorize NetGoblin to act as my Authorized
                      Agent as described above.
                    </span>
                  </label>

                  <Field
                    label="Signature (type your full legal name)"
                    value={sig1Name}
                    onChange={setSig1Name}
                    placeholder="Type your full legal name"
                  />

                  <p className="text-xs text-[#E3DAC9]/55">
                    Tip: Use the exact legal name you provided above.
                  </p>
                </Section>

                <div className="pt-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <button
                    onClick={submit}
                    disabled={!canSubmit}
                    className={cx(
                      "px-6 py-3 rounded-full text-sm sm:text-base font-semibold transition-colors",
                      "shadow-[0_0_12px_rgba(255,191,0,0.22)]",
                      canSubmit
                        ? "bg-[#FFBF00] text-[#171710] hover:bg-[#E3DAC9]"
                        : "bg-[#FFBF00]/30 text-[#171710]/70 cursor-not-allowed"
                    )}
                  >
                    Submit Intake
                  </button>

                  <p className="text-xs text-[#E3DAC9]/60">
                    By submitting, you confirm accuracy and provide authorized-agent
                    consent.
                  </p>
                </div>

                {msg && (
                  <div className="mt-3 rounded-xl border border-[#1F3B1D]/60 bg-[#171710]/25 px-4 py-3 text-sm text-[#E3DAC9]/80 whitespace-pre-wrap">
                    {msg}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-[#E3DAC9]/55">
          NetGoblin operates with least-privilege access and secure processing.
          Your link is time-limited and single-use.
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  muted,
  children,
}: {
  title: string;
  subtitle?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border px-5 sm:px-6 py-5",
        muted
          ? "border-[#1F3B1D]/45 bg-[#171710]/20"
          : "border-[#1F3B1D]/60 bg-[#171710]/10"
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-[#E3DAC9]">{title}</div>
        {subtitle && (
          <div className="text-xs text-[#E3DAC9]/60 text-right">{subtitle}</div>
        )}
      </div>
      <div className="mt-4 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-[#E3DAC9]">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          mt-2 w-full rounded-xl px-4 py-3
          bg-[#171710]/60
          border border-[#1F3B1D]/70
          text-[#E3DAC9]
          placeholder:text-[#E3DAC9]/40
          outline-none
          focus:border-[#FFBF00]/70 focus:ring-2 focus:ring-[#FFBF00]/20
          transition
        "
      />
    </label>
  );
}
