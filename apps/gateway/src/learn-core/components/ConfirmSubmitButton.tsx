'use client';

/**
 * A submit button that blocks the enclosing form's submission behind a
 * native confirm() dialog — for destructive admin actions (delete, revoke,
 * suspend) where a stray click shouldn't be instantly irreversible.
 */
export default function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
