'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical, Loader2, HelpCircle } from 'lucide-react';
import type { QualificationQuestion, QualifyingAnswer } from '@/lib/types/funnel';

interface QuestionsManagerProps {
  funnelId: string | null;
  questions: QualificationQuestion[];
  setQuestions: (questions: QualificationQuestion[]) => void;
  onNeedsSave: () => void;
}

export function QuestionsManager({
  funnelId,
  questions,
  setQuestions,
  onNeedsSave,
}: QuestionsManagerProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const [newQualifyingAnswer, setNewQualifyingAnswer] = useState<QualifyingAnswer>('yes');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;

    if (!funnelId) {
      onNeedsSave();
      setError('Please save the funnel first before adding questions.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/funnel/${funnelId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: newQuestion.trim(),
          qualifyingAnswer: newQualifyingAnswer,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add question');
      }

      const { question } = await response.json();
      setQuestions([...questions, question]);
      setNewQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuestion = async (questionId: string, updates: Partial<{ questionText: string; qualifyingAnswer: QualifyingAnswer }>) => {
    if (!funnelId) return;

    try {
      const response = await fetch(`/api/funnel/${funnelId}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update question');
      }

      const { question: updated } = await response.json();
      setQuestions(questions.map(q => q.id === questionId ? updated : q));
    } catch (err) {
      console.error('Update question error:', err);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!funnelId) return;

    try {
      const response = await fetch(`/api/funnel/${funnelId}/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (err) {
      console.error('Delete question error:', err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    dragCounter.current++;
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDrop = async (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex || !funnelId) {
      handleDragEnd();
      return;
    }

    // Reorder locally first for immediate feedback
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(targetIndex, 0, removed);
    setQuestions(newQuestions);
    handleDragEnd();

    // Save to server
    try {
      const response = await fetch(`/api/funnel/${funnelId}/questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: newQuestions.map(q => q.id),
        }),
      });

      if (!response.ok) {
        // Revert on error
        setQuestions(questions);
        console.error('Failed to reorder questions');
      }
    } catch (err) {
      // Revert on error
      setQuestions(questions);
      console.error('Reorder error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Qualification Questions
        </h3>
        <p className="text-sm text-muted-foreground">
          Add yes/no questions to qualify leads. Only leads who answer correctly will see your Calendly booking widget.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Existing Questions */}
      <div className="space-y-3">
        {questions.map((question, index) => (
          <div
            key={question.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDrop={() => handleDrop(index)}
            className={`rounded-lg border bg-card p-4 flex items-start gap-3 transition-all ${
              draggedIndex === index ? 'opacity-50 scale-[0.98]' : ''
            } ${
              dragOverIndex === index ? 'border-primary border-2 shadow-lg' : ''
            }`}
          >
            <div className="text-muted-foreground cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Q{index + 1}
                </span>
                <input
                  type="text"
                  value={question.questionText}
                  onChange={(e) => handleUpdateQuestion(question.id, { questionText: e.target.value })}
                  className="flex-1 rounded border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">Qualifying answer:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateQuestion(question.id, { qualifyingAnswer: 'yes' })}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      question.qualifyingAnswer === 'yes'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleUpdateQuestion(question.id, { qualifyingAnswer: 'no' })}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      question.qualifyingAnswer === 'no'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeleteQuestion(question.id)}
              className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Question */}
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">New Question</label>
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            placeholder="Do you have a team of at least 5 people?"
            onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Qualifying answer:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setNewQualifyingAnswer('yes')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  newQualifyingAnswer === 'yes'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setNewQualifyingAnswer('no')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  newQualifyingAnswer === 'no'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <button
            onClick={handleAddQuestion}
            disabled={!newQuestion.trim() || saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Question
          </button>
        </div>
      </div>

      {questions.length === 0 && (
        <div className="text-center py-8 space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
            <HelpCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No qualification questions yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Add yes/no questions to qualify your leads. Only leads who answer correctly will see your calendar booking widget.
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Example: &ldquo;Do you have a budget of at least $5,000?&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Reorder hint */}
      {questions.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Drag questions to reorder them
        </p>
      )}
    </div>
  );
}
