'use client';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, variant = 'primary', confirm, name, value, form }: {
  children: React.ReactNode; variant?: 'primary' | 'dark' | 'outline' | 'danger'; confirm?: string; name?: string; value?: string;
  /** id формы, если кнопка стоит вне неё (строки таблиц) */
  form?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: 'btn-primary', dark: 'btn-dark', outline: 'btn-outline',
    danger: 'btn border border-red-200 text-red-700 hover:bg-red-50',
  };
  return (
    <button
      type="submit"
      name={name}
      value={value}
      form={form}
      disabled={pending}
      className={`${styles[variant]} btn-sm`}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? 'Сохранение…' : children}
    </button>
  );
}
