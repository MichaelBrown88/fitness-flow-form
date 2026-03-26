import { SmartInput } from '@/components/ui/SmartInput';
import type { FieldValue } from '../hooks/useFieldControl';

interface FieldInputProps {
  id: string;
  type: string;
  placeholder?: string;
  // New props for SmartInput pattern
  value: FieldValue;
  onValueChange: (val: string) => void;
}

export const FieldInput: React.FC<FieldInputProps> = ({
  id,
  type,
  placeholder,
  value,
  onValueChange,
}) => {
  return (
    <SmartInput
      id={id}
      name={id}
      type={type}
      placeholder={placeholder}
      value={(value as string) ?? ''}
      onValueChange={onValueChange}
      className="h-12 rounded-xl border-border focus:ring-primary"
    />
  );
};
