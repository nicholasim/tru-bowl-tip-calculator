'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Imperative window.confirm() replacement. Renders one dialog instance and
 * returns confirm(message), a Promise<boolean> -- Confirm resolves true;
 * Cancel, the close button, an outside click, and Escape all resolve false,
 * matching window.confirm's cancel/dismiss semantics so call sites can just
 * swap `window.confirm(msg)` for `await confirm(msg)`.
 */
export function useConfirmDialog() {
  const [state, setState] = useState({ open: false, message: '' })
  const resolveRef = useRef(null)

  const confirm = useCallback((message) => {
    setState({ open: true, message })
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const settle = (result) => {
    resolveRef.current?.(result)
    resolveRef.current = null
  }

  const handleOpenChange = (open) => {
    if (!open) settle(false)
    setState((s) => ({ ...s, open }))
  }

  const handleConfirm = () => {
    settle(true)
    setState((s) => ({ ...s, open: false }))
  }

  const dialog = (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Please confirm</DialogTitle>
          <DialogDescription>{state.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { confirm, dialog }
}
