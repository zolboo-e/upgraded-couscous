"use client";

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Input } from "@repo/ui";
import { useState } from "react";

export interface QuestionOption {
  label: string;
  description: string;
}

export interface QuestionItem {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface AskUserQuestionRequest {
  requestId: string;
  questions: QuestionItem[];
}

interface AskUserQuestionProps {
  request: AskUserQuestionRequest;
  onAnswer: (requestId: string, answers: Record<string, string>) => void;
}

export function AskUserQuestion({ request, onAnswer }: AskUserQuestionProps): React.ReactElement {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});

  const handleOptionSelect = (question: string, label: string): void => {
    if (label === "__custom__") {
      setShowCustomInput((prev) => ({ ...prev, [question]: true }));
    } else {
      setAnswers((prev) => ({ ...prev, [question]: label }));
      setShowCustomInput((prev) => ({ ...prev, [question]: false }));
    }
  };

  const handleCustomInputChange = (question: string, value: string): void => {
    setCustomInputs((prev) => ({ ...prev, [question]: value }));
    setAnswers((prev) => ({ ...prev, [question]: value }));
  };

  const handleSubmit = (): void => {
    onAnswer(request.requestId, answers);
  };

  const allQuestionsAnswered = request.questions.every((q) => answers[q.question]?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-blue-500">❓</span>
            Claude needs your input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {request.questions.map((q) => (
            <div key={q.question} className="space-y-3">
              <div>
                <span className="text-xs font-medium text-foreground/60 uppercase tracking-wide">
                  {q.header}
                </span>
                <p className="mt-1 font-medium">{q.question}</p>
              </div>

              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleOptionSelect(q.question, opt.label)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      answers[q.question] === opt.label
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-sm text-foreground/60">{opt.description}</p>
                  </button>
                ))}

                {/* Other option */}
                <button
                  type="button"
                  onClick={() => handleOptionSelect(q.question, "__custom__")}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    showCustomInput[q.question]
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium">Other</p>
                  <p className="text-sm text-foreground/60">Enter a custom response</p>
                </button>

                {showCustomInput[q.question] && (
                  <Input
                    placeholder="Enter your response..."
                    value={customInputs[q.question] ?? ""}
                    onChange={(e) => handleCustomInputChange(q.question, e.target.value)}
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!allQuestionsAnswered}>
            Submit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
