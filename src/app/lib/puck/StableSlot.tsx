import type { SlotComponent } from '@puckeditor/core'

type StableSlotProps = NonNullable<Parameters<SlotComponent>[0]> & { slot: SlotComponent }

/** Puck regenerates slot callbacks after child edits. Keep the React component type stable. */
export default function StableSlot({ slot, ...props }: StableSlotProps) {
    return slot(props)
}
