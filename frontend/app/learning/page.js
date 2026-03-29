"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { getSession } from "../../lib/session";

export default function LearningPage() {
  const [session, setSession] = useState(null);
  const [quests, setQuests] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [totalLearningMinutes, setTotalLearningMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadQuests(userId) {
    setLoading(true);
    setError("");
    try {
      const result = await api.getLearningQuests(userId);
      setQuests(result.quests || []);
      setCompletedCount(result.completedCount || 0);
      setTotalCount(result.totalCount || 0);
      setCompletionRate(result.completionRate || 0);
      setTotalLearningMinutes(result.totalLearningMinutes || 0);
    } catch (err) {
      setError(err.message || "Unable to load learning quests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const current = getSession();
    setSession(current);

    if (!current?.userId) {
      setLoading(false);
      return;
    }

    loadQuests(current.userId);
  }, []);

  async function handleComplete(questId) {
    if (!session?.userId) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const result = await api.completeQuest(session.userId, questId);
      setMessage(`Quest completed. +${result.xpEarned} XP earned.`);
      await loadQuests(session.userId);
    } catch (err) {
      setError(err.message || "Unable to complete quest");
    }
  }

  if (!session?.userId) {
    return (
      <article className="card">
        <h2>No active profile found</h2>
        <p className="muted">Complete onboarding before starting learning quests.</p>
        <a className="btn primary" href="/onboarding">
          Go to onboarding
        </a>
      </article>
    );
  }

  if (loading) {
    return <article className="card">Loading quests...</article>;
  }

  return (
    <section className="grid">
      <article className="card highlight-card">
        <h2>Financial learning lab</h2>
        <p className="muted">
          Learn finance in practical modules with objectives, key takeaways,
          common mistakes, and action tasks you can apply immediately.
        </p>
        <div className="pill-list">
          <span className="pill">Completed: {completedCount}</span>
          <span className="pill">Total modules: {totalCount}</span>
          <span className="pill">Completion: {Number(completionRate).toFixed(1)}%</span>
          <span className="pill">Learning library: {totalLearningMinutes} min</span>
        </div>
        <div className="actions">
          <a className="btn secondary" href="/finance-guide">
            Open full finance guide
          </a>
          <a className="btn ghost" href="/investing">
            Learn stocks and bonds
          </a>
        </div>
      </article>

      {error ? <article className="card error">{error}</article> : null}
      {message ? <article className="card success">{message}</article> : null}

      <div className="grid two">
        {quests.map((quest) => (
          <article className="card" key={quest.id}>
            <h3>{quest.title}</h3>
            <div className="pill-list">
              <span className="pill">Topic: {quest.topic}</span>
              <span className="pill">Difficulty: {quest.difficulty || "beginner"}</span>
              <span className="pill">Duration: {quest.durationSeconds / 60} min</span>
            </div>
            <p>{quest.content}</p>

            {(quest.learningObjectives || []).length ? (
              <>
                <h4 className="section-title">Learning objectives</h4>
                <ul>
                  {quest.learningObjectives.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {(quest.keyTakeaways || []).length ? (
              <>
                <h4 className="section-title">Key takeaways</h4>
                <ul>
                  {quest.keyTakeaways.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {(quest.commonMistakes || []).length ? (
              <>
                <h4 className="section-title">Common mistakes to avoid</h4>
                <ul>
                  {quest.commonMistakes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {quest.actionStep ? (
              <div className="info-block">
                <strong>Action task:</strong> {quest.actionStep}
              </div>
            ) : null}

            {quest.quiz ? (
              <div className="metric-slab" style={{ marginTop: "0.7rem" }}>
                <h4 className="section-title">Quick check</h4>
                <p><strong>Q:</strong> {quest.quiz.question}</p>
                <ul>
                  {(quest.quiz.options || []).map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ul>
                <p className="muted"><strong>Answer:</strong> {quest.quiz.answer}</p>
                <p className="muted">{quest.quiz.explanation}</p>
              </div>
            ) : null}

            {(quest.resources || []).length ? (
              <>
                <h4 className="section-title">Further resources</h4>
                <ul>
                  {quest.resources.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <button
              className="btn primary"
              disabled={quest.completed}
              onClick={() => handleComplete(quest.id)}
              type="button"
            >
              {quest.completed ? "Completed" : "Mark completed"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
