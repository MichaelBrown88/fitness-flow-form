import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface SmartInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  value: string | number;
  onValueChange: (value: string) => void; // Standardized change handler
  debounceMs?: number;
}

export const SmartInput = ({ 
  value: parentValue, 
  onValueChange, 
  debounceMs = 300, 
  ...props 
}: SmartInputProps) => {
  const [localValue, setLocalValue] = useState(parentValue);
  const isTypingRef = useRef(false);

  // 1. Sync from Parent (e.g., if Demo Data is clicked)
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalValue(parentValue);
    }
  }, [parentValue]);

  // 2. Handle Typing locally (Instant UI feedback, no global re-render)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    setLocalValue(e.target.value);
  };

  // 3. Sync to Global Context only when user stops typing (Debounce) or leaves field (Blur)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== parentValue) {
        onValueChange(String(localValue));
        isTypingRef.current = false; // Release lock
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localValue, debounceMs, parentValue, onValueChange]);

  const handleBlur = () => {
    // Force sync immediately on blur
    if (localValue !== parentValue) {
      onValueChange(String(localValue));
      isTypingRef.current = false;
    }
  };

  return (
    <Input
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};
