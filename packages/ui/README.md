# @susmi/ui

Shared UI components library for Susmi applications.

## Components

This package includes the following components built with Radix UI and Tailwind CSS:

- **Badge** - Display status badges and labels
- **Button** - Clickable button component with variants
- **Card** - Container component for content
- **Checkbox** - Checkbox input with label support
- **Dialog** - Modal dialog component
- **DropdownMenu** - Dropdown menu with items
- **Input** - Text input field
- **Label** - Form label component
- **Popover** - Popover overlay component
- **Select** - Select dropdown component
- **Separator** - Visual separator line
- **Textarea** - Multiline text input

## Installation

This package is part of the Susmi monorepo and is automatically available to all apps in the workspace.

## Usage

```tsx
import { Button, Card, Input } from '@susmi/ui';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text" />
      <Button>Submit</Button>
    </Card>
  );
}
```

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev
```

## Dependencies

This package uses:
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **clsx** and **tailwind-merge** - Class name utilities
