import React from 'react';
import { Input } from '@/components/ui/input';
import type { FieldValue } from '../hooks/useFieldControl';

interface FieldInputProps {
  id: string;
  type: string;
  placeholder?: string;
  localValue: FieldValue;
  setLocalValue: (val: FieldValue) => void;
  handleChange: (val: FieldValue) => void;
}

export const FieldInput: React.FC<FieldInputProps> = ({
  id,
  type,
  placeholder,
  localValue,
  setLocalValue,
  handleChange,
}) => {
  return (
    <Input
      id={id}
      name={id}
      type={type}
      placeholder={placeholder}
      value={(localValue as string) ?? ''}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={() => handleChange(localValue)}
      className="h-12 rounded-xl border-slate-200 focus:ring-primary"
    />
  );
};
