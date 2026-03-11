import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '../../lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-[var(--switch-track-border)] bg-[var(--switch-track-bg)] p-[1px] outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb className="pointer-events-none block size-5 rounded-full border border-[var(--switch-thumb-border)] bg-[var(--switch-thumb-bg)] shadow-[0_4px_5px_-2px_rgba(0,0,0,0.05),0_10px_13px_-3px_rgba(0,0,0,0.1)] ring-0 transition-transform duration-200 ease-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitives.Root>
  )
}

export { Switch }
