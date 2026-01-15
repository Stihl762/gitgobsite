import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type StartResp =
  | { status: "PENDING"; requestId: string }
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

export default function IntakePage() {
  const router = useRouter();
  const code = typeof router.query.code === "string" ? router.query.code : "";

  const [state, setState] = useState<
    "loading" | "pending" | "submitted" | "invalid" | "error"
  >("loading");

  const [msg, setMsg] = useState("");

  // Basic v1 intake fields (expand later)
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!code) return;

    const check = async () => {
      setState("loading");
      setMsg("");

      try {
        const res = await fetch("/api/intake/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const text = await res.text().catch(() => "");
        const data = safeJsonParse(text) as StartResp | null;

        // If API returned empty/non-JSON, show raw diagnostics
        if (!data) {
          setState("error");
          setMsg(
            `API returned non-JSON/empty body. HTTP ${res.status}. ` +
              (text ? `Body: ${text.slice(0, 300)}` : "Body was empty.")
          );
          return;
        }

        if (data.status === "PENDING") return setState("pending");
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
  }, [code]);

  const submit = async () => {
    setMsg("");

    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          payload: { fullName, dob, phone, address },
        }),
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

      setMsg(`Submit failed: ${data.status || "ERROR"}`);
    } catch (err: any) {
      setMsg(err?.message || "Network error.");
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>NetGoblin Intake</h1>

      {state === "loading" && <p>Checking your secure link…</p>}

      {state === "invalid" && (
        <>
          <p><b>Invalid link</b></p>
          <p>{msg}</p>
        </>
      )}

      {state === "error" && (
        <>
          <p><b>Error</b></p>
          <p style={{ whiteSpace: "pre-wrap" }}>{msg}</p>
        </>
      )}

      {state === "submitted" && (
        <>
          <p><b>Submitted</b></p>
          <p>Your intake is complete. We’ll begin the hunt.</p>
        </>
      )}

      {state === "pending" && (
        <>
          <p><b>Secure link verified.</b> Please complete this once.</p>

          <label style={{ display: "block", marginTop: 12 }}>
            Full legal name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Date of birth
            <input
              placeholder="YYYY-MM-DD"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Address
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <button onClick={submit} style={{ marginTop: 16, padding: "10px 16px" }}>
            Submit Intake
          </button>

          {msg && <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</p>}
        </>
      )}
    </main>
  );
}
