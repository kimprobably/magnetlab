'use client';

interface FormErrorProps {
  message: string | null;
  onDismiss?: () => void;
}

export function FormError({ message, onDismiss }: FormErrorProps): JSX.Element | null {
  if (!message) return null;

  return (
    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
      {message}
      {onDismiss && (
        <button onClick={onDismiss} className="ml-2 underline">
          Dismiss
        </button>
      )}
    </div>
  );
}
