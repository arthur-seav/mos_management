import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import OptionGroupCard from '@/components/options/OptionGroupCard'
import type { OptionGroup } from '@/lib/types'

const sugar: OptionGroup = {
  id: 4,
  name: 'Sugar level',
  selectionType: 'single',
  isRequired: false,
  maxSelect: 1,
  sortOrder: 3,
  needsIcedDrink: false,
  summaryNoun: null,
  options: [{ id: 41, groupId: 4, name: 'Half', extraPrice: 0, sortOrder: 1, isActive: true, isIced: false }]
}

describe('OptionGroupCard', () => {
  it('says so when a group has no options yet', () => {
    render(<OptionGroupCard group={{ ...sugar, options: [] }} onEditGroup={vi.fn()} onAddOption={vi.fn()} onEditOption={vi.fn()} />)

    expect(screen.getByText('No options yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('hands the clicked option, not the group, to the edit callback', async () => {
    const onEditOption = vi.fn()
    render(<OptionGroupCard group={sugar} onEditGroup={vi.fn()} onAddOption={vi.fn()} onEditOption={onEditOption} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit Half in Sugar level' }))

    expect(onEditOption).toHaveBeenCalledWith(sugar.options[0])
  })

  it('names its own add button after the group, so one card cannot add to another', () => {
    render(<OptionGroupCard group={sugar} onEditGroup={vi.fn()} onAddOption={vi.fn()} onEditOption={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Add option to Sugar level' })).toBeInTheDocument()
  })
})
