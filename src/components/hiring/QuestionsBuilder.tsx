/**
 * Questions Builder for assignment templates.
 * Supports Multiple Choice and Paragraph question types.
 */

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssignmentQuestion } from '@/types/hiring';

interface QuestionsBuilderProps {
  questions: AssignmentQuestion[];
  onChange: (questions: AssignmentQuestion[]) => void;
}

export function QuestionsBuilder({ questions, onChange }: QuestionsBuilderProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addQuestion = () => {
    const newQ: AssignmentQuestion = {
      id: crypto.randomUUID(),
      text: '',
      type: 'paragraph',
      options: [],
      required: true,
    };
    onChange([...questions, newQ]);
    setExpandedIds((prev) => new Set(prev).add(newQ.id));
  };

  const updateQuestion = (id: string, patch: Partial<AssignmentQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addOption = (questionId: string) => {
    const q = questions.find((q) => q.id === questionId);
    if (!q) return;
    updateQuestion(questionId, { options: [...(q.options || []), ''] });
  };

  const updateOption = (questionId: string, optIndex: number, value: string) => {
    const q = questions.find((q) => q.id === questionId);
    if (!q) return;
    const opts = [...(q.options || [])];
    opts[optIndex] = value;
    updateQuestion(questionId, { options: opts });
  };

  const removeOption = (questionId: string, optIndex: number) => {
    const q = questions.find((q) => q.id === questionId);
    if (!q) return;
    const opts = (q.options || []).filter((_, i) => i !== optIndex);
    updateQuestion(questionId, { options: opts });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Questions</Label>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-1" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
          No questions yet. Click "Add Question" to create one.
        </p>
      )}

      {questions.map((q, index) => {
        const isExpanded = expandedIds.has(q.id);
        return (
          <Card key={q.id} className="overflow-hidden">
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpand(q.id)}
            >
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, -1); }}
                  disabled={index === 0}
                >
                  <ChevronDown className="h-3 w-3 rotate-180" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, 1); }}
                  disabled={index === questions.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-xs font-medium text-muted-foreground w-5">
                {index + 1}.
              </span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 text-sm truncate">
                {q.text || 'Untitled question'}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {q.type === 'multiple_choice' ? 'Multiple Choice' : 'Paragraph'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-3 border-t">
                <div className="space-y-2 pt-3">
                  <Label className="text-xs">Question Text</Label>
                  <Input
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                    placeholder="Enter your question..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={q.type}
                      onValueChange={(v) =>
                        updateQuestion(q.id, {
                          type: v as 'multiple_choice' | 'paragraph',
                          options: v === 'multiple_choice' ? (q.options?.length ? q.options : ['']) : [],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Required</Label>
                    <div className="flex items-center h-10">
                      <Switch
                        checked={q.required}
                        onCheckedChange={(v) => updateQuestion(q.id, { required: v })}
                      />
                    </div>
                  </div>
                </div>

                {q.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Options</Label>
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(q.id, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeOption(q.id, oi)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(q.id)}
                      className="mt-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Option
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
