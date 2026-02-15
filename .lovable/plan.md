
## Convert WikiShareDialog from Sheet (Slider) to Dialog (Pop-up)

### What Changes

The `WikiShareDialog` currently uses a `Sheet` component (slides in from the right side). This will be converted to a `Dialog` (centered pop-up modal) to match the user's preference for a consistent pop-up style across the system.

### Technical Changes

**`src/components/wiki/WikiShareDialog.tsx`** (single file change):

1. Replace `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription` imports with `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription` from `@/components/ui/dialog`
2. Swap the JSX wrapper from `<Sheet>` to `<Dialog>` and `<SheetContent>` to `<DialogContent>`
3. Replace `<SheetHeader>` with `<DialogHeader>`, `<SheetTitle>` with `<DialogTitle>`, `<SheetDescription>` with `<DialogDescription>`
4. Adjust the content container styling: remove the Sheet-specific `sm:max-w-md w-full flex flex-col p-0 overflow-hidden` class and apply Dialog-appropriate sizing (`sm:max-w-lg` with proper padding and scroll behavior)
5. Keep all internal logic, sub-components, and nested dialogs (transfer ownership, confirmation) exactly as-is

No other files need changes -- the `WikiShareDialog` is already used via its `open`/`onOpenChange` props everywhere (Wiki.tsx, WikiEditPage.tsx, WikiFolderView.tsx), so swapping the container component is fully transparent to consumers.
