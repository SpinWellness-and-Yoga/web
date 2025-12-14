'use client';

import { useState } from "react";
import styles from "../page.module.css";

type FormStatus = "idle" | "loading" | "success" | "error";

type FormState = {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  priority: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  company: "",
  teamSize: "",
  priority: "",
};

export default function WaitlistCard() {
  const [formData, setFormData] = useState<FormState>(initialState);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [feedback, setFeedback] = useState(
    "Share your team's needs and we'll respond soon."
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Waitlist submission failed");
      }

      setStatus("success");
      setFeedback("You're on the list! We'll share activation details soon.");
      setFormData(initialState);
    } catch {
      setStatus("error");
      setFeedback("Something went wrong. Please try again or email hello@spinwellness.com.");
    }
  };

  return (
    <div className={styles.waitlistPane}>
      <h2 className={styles.waitlistHeading}>Join the Spinwellness waitlist</h2>
      <p className={styles.waitlistCopy}>{feedback}</p>
      <form className={styles.waitlistForm} onSubmit={handleSubmit}>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Full name"
          required
        />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Work email"
          required
        />
        <input
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder="Company"
          required
        />
        <select name="teamSize" value={formData.teamSize} onChange={handleChange} required>
          <option value="" disabled>
            Team size
          </option>
          <option value="1-25">1-25</option>
          <option value="26-100">26-100</option>
          <option value="101-300">101-300</option>
          <option value="301-1000">301-1000</option>
          <option value="1000+">1000+</option>
        </select>
        <textarea
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          placeholder="What should we prioritise for your people?"
          rows={3}
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Submitting..." : "Join the waitlist"}
        </button>
      </form>
      <p className={styles.status} role="status" aria-live="polite" data-status={status}>
        {status === "success" && "Thank you — we'll be in touch soon."}
        {status === "error" && "Please refresh and try again."}
      </p>
    </div>
  );
}
