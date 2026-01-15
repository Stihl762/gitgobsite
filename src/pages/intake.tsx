import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type StartResp =
  | { status: "PENDING"; requestId: string }
  | { status: "SUBMITTED"; requestId: string }
  | { status: "INVALID"; requestId: string }
  | { status: "ERROR"; requestId: string; details?: string };

export default function IntakePage() {
  const router = useRouter();
  const code = typeof router.query.code === "string" ? router.query.code : "";

  const [state, setState] = useState<
    "loading" | "pending" | "submitted" | "invalid" | "error"
  >("loading");

  const [msg, setMsg] = useState("");

  // Basic v1 intake fields
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!code) return;

    const check = async () => {
      try {
        const res = await fetch("/api/intake/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data: StartResp = await res.json();

        if (data.status === "PENDING") return setState("pending");
        if (data.status === "SUBMITTED") return setState("submitted");
        if (data.status === "INVALID") {
          setState("invalid");
          setMsg("This intake link is invalid or expired.");
          return;
        }

        setState("error");
        setMsg(data.details || "Server error.");
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
          payload: {
            fullName,
            dob,
            phone,
            address,
          },
        }),
      });

      const data = await res.json();

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
          <p>{msg}</p>
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

          <label>
            Full legal name
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>

          <label>
            Date of birth
            <input
              placeholder="YYYY-MM-DD"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </label>

          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          <label>
            Address
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>

          <button onClick={submit} style={{ marginTop: 12 }}>
            Submit Intake
          </button>

          {msg && <p>{msg}</p>}
        </>
      )}
    </main>
  );
}
