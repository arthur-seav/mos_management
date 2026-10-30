import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type Choice = { value: string; label: string }

/**
 * A plain one-of-many select for the menu screens (filters, category picker).
 * Values are strings so the filters and the form keep the same shape; an empty
 * string means "nothing chosen yet" and shows the placeholder.
 */
export default function ChoiceSelect({
  label,
  value,
  onChange,
  choices,
  placeholder = 'Choose one',
  className,
  invalid
}: {
  /** Accessible name of the control, e.g. "Category". */
  label: string
  value: string
  onChange: (value: string) => void
  choices: Choice[]
  placeholder?: string
  className?: string
  invalid?: boolean
}) {
  return (
    <Select
      items={choices}
      value={value === '' ? null : value}
      onValueChange={next => onChange(next === null ? '' : String(next))}
    >
      <SelectTrigger aria-label={label} aria-invalid={invalid} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {choices.map(choice => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
