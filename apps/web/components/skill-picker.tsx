"use client";
import { useEffect, useId, useState } from "react";

type Skill = { id: string; name: string };
export default function SkillPicker({
  initialSkills,
}: {
  initialSkills: string[];
}) {
  const id = useId();
  const [selected, setSelected] = useState(initialSkills);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/skills", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Unable to load skills. Retry or sign in again.");
        return response.json();
      })
      .then((data) => {
        setCatalog(data.skills);
        setLoading(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt]);
  const options = catalog.filter(
    (skill) =>
      !selected.includes(skill.name) &&
      skill.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const expanded = open && !loading && !error && selected.length < 12;
  function choose(skill: Skill) {
    setSelected([...selected, skill.name]);
    setOpen(false);
    setQuery("");
    setActive(0);
  }
  return (
    <div className="skill-picker">
      <input type="hidden" name="skills" value={JSON.stringify(selected)} />
      <label htmlFor={id}>Skills</label>
      <p id={`${id}-help`}>
        Choose up to 12 skills from the shared catalog. Type to search, then
        select a suggestion.
      </p>
      <div className="skill-chips">
        {selected.map((name) => (
          <button
            type="button"
            key={name}
            aria-label={`Remove ${name}`}
            onClick={() => setSelected(selected.filter((s) => s !== name))}
          >
            {name}
            <span aria-hidden="true"> ×</span>
          </button>
        ))}
      </div>
      <input
        id={id}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={Boolean(expanded)}
        aria-controls={`${id}-list`}
        aria-describedby={`${id}-help`}
        aria-activedescendant={
          expanded && options[active]
            ? `${id}-option-${options[active].id}`
            : undefined
        }
        placeholder={
          selected.length >= 12 ? "12 skills selected" : "Search skills…"
        }
        disabled={loading || !!error || selected.length >= 12}
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive((n) =>
              Math.max(
                0,
                Math.min(
                  options.length - 1,
                  n + (e.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (expanded && options[active]) choose(options[active]);
          }
        }}
      />
      {loading && <p role="status">Loading skills…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setLoading(true);
              setAttempt(attempt + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
      {expanded && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Suggested skills"
          className="skill-options"
        >
          {options.map((skill, index) => (
            <li
              key={skill.id}
              id={`${id}-option-${skill.id}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(skill)}
            >
              {skill.name}
            </li>
          ))}
          {!options.length && (
            <li role="presentation">No matching skills. Try another search.</li>
          )}
        </ul>
      )}
      <p aria-live="polite">{selected.length} of 12 selected</p>
    </div>
  );
}
