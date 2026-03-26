import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import type { FieldValue } from '../hooks/useFieldControl';

interface FieldTextAreaProps {
  id: string;
  placeholder?: string;
  localValue: FieldValue;
  setLocalValue: (val: FieldValue) => void;
  handleChange: (val: FieldValue) => void;
  debouncedHandleChange: (val: FieldValue) => void;
}

export const FieldTextArea: React.FC<FieldTextAreaProps> = ({
  id,
  placeholder,
  localValue,
  setLocalValue,
  handleChange,
  debouncedHandleChange,
}) => {
  return (
    <Textarea
      id={id}
      name={id}
      placeholder={placeholder}
      value={(localValue as string) ?? ''}
      onChange={(event) => {
        setLocalValue(event.target.value);
        debouncedHandleChange(event.target.value);
      }}
      onBlur={() => handleChange(localValue)}
      rows={4}
      className="mt-2 rounded-xl border-border focus:ring-primary"
    />
  );
};
