"use client";

import { Button, Input } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps): React.ReactElement {
  const form = useForm({
    defaultValues: {
      message: "",
    },
    onSubmit: async ({ value }) => {
      const trimmed = value.message.trim();
      if (trimmed && !disabled) {
        onSend(trimmed);
        form.reset();
      }
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex gap-2"
    >
      <form.Field name="message">
        {(field) => (
          <Input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className="flex-1"
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.message}>
        {(message) => (
          <Button type="submit" disabled={disabled || !message.trim()}>
            Send
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
