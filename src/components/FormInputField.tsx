import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormInputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  touched?: boolean;
}

export const FormInputField = forwardRef<HTMLInputElement, FormInputFieldProps>(
  ({ id, label, value, onChange, onBlur, required = false, type = "text", placeholder, className, error, touched }, ref) => {
    const hasError = touched && error;
    const isValid = touched && !error && value;

    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={id} className="flex items-center gap-1">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            name={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            className={cn(
              "pr-10 transition-all duration-200",
              hasError && "border-destructive focus-visible:ring-destructive",
              isValid && "border-green-500 focus-visible:ring-green-500"
            )}
          />
          {isValid && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
          {hasError && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
        </div>
        {hasError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInputField.displayName = "FormInputField";