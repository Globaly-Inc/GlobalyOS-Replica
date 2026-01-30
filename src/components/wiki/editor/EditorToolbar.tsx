/**
 * EditorToolbar - Memoized toolbar component for WikiRichEditor
 * Extracted to prevent re-renders on every keystroke
 */

import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, 
  List, ListOrdered, Link, Image, FileText, 
  Code, Quote, Minus, Table, Upload, Underline,
  Type, Undo2, Redo2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { WikiAIWritingAssist } from '../WikiAIWritingAssist';

interface EditorToolbarProps {
  activeHeading: string | null;
  activeTextSize: number;
  textSizeInput: string;
  isUploading: boolean;
  editorValue: string;
  organizationId?: string;
  // Function to check if a command is active (uses document.queryCommandState internally)
  isCommandActive: (command: string) => boolean;
  // Callbacks
  onToggleHeading: (heading: 'h1' | 'h2' | 'h3') => void;
  onTextSizeChange: (value: string) => void;
  onTextSizeBlur: () => void;
  onExecCommand: (command: string, value?: string) => void;
  onFormatBlock: (tag: string) => void;
  onInsertLink: () => void;
  onInsertImage: () => void;
  onInsertFile: () => void;
  onInsertCodeBlock: () => void;
  onInsertTable: () => void;
  onInsertDivider: () => void;
  onInsertEmbed: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAIGenerated: (text: string) => void;
  onSaveSelection: () => void;
}

const DEFAULT_TEXT_SIZE = 14;

const ToolbarButton = memo(({ 
  icon: Icon, 
  active, 
  onClick, 
  onMouseDown,
  label,
  disabled,
  className
}: { 
  icon: typeof Bold; 
  active?: boolean; 
  onClick: () => void; 
  onMouseDown?: (e: React.MouseEvent) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant={active ? 'secondary' : 'ghost'}
        size="sm"
        onMouseDown={onMouseDown}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        disabled={disabled}
        className={cn("h-8 w-8 p-0", className)}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
));

ToolbarButton.displayName = 'ToolbarButton';

const ToolbarDivider = () => <div className="w-px h-5 bg-border mx-1" />;

export const EditorToolbar = memo(({
  activeHeading,
  activeTextSize,
  textSizeInput,
  isUploading,
  editorValue,
  organizationId,
  isCommandActive,
  onToggleHeading,
  onTextSizeChange,
  onTextSizeBlur,
  onExecCommand,
  onFormatBlock,
  onInsertLink,
  onInsertImage,
  onInsertFile,
  onInsertCodeBlock,
  onInsertTable,
  onInsertDivider,
  onInsertEmbed,
  onUndo,
  onRedo,
  onAIGenerated,
  onSaveSelection,
}: EditorToolbarProps) => {
  const preventDefaultAndSave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSaveSelection();
  }, [onSaveSelection]);

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 p-2 border-b bg-background/95 backdrop-blur-sm shadow-sm rounded-t-lg">
        {/* Undo/Redo */}
        <ToolbarButton 
          icon={Undo2} 
          onClick={onUndo} 
          label="Undo (Ctrl+Z)" 
        />
        <ToolbarButton 
          icon={Redo2} 
          onClick={onRedo} 
          label="Redo (Ctrl+Y)" 
        />
        
        <ToolbarDivider />
        
        {/* Text formatting */}
        <ToolbarButton 
          icon={Bold} 
          active={isCommandActive('bold')} 
          onClick={() => onExecCommand('bold')} 
          label="Bold (Ctrl+B)" 
        />
        <ToolbarButton 
          icon={Italic} 
          active={isCommandActive('italic')} 
          onClick={() => onExecCommand('italic')} 
          label="Italic (Ctrl+I)" 
        />
        <ToolbarButton 
          icon={Underline} 
          active={isCommandActive('underline')} 
          onClick={() => onExecCommand('underline')} 
          label="Underline (Ctrl+U)" 
        />
        
        <ToolbarDivider />
        
        {/* Headings */}
        <ToolbarButton 
          icon={Heading1} 
          active={activeHeading === 'h1'} 
          onClick={() => onToggleHeading('h1')}
          onMouseDown={preventDefaultAndSave}
          label="Heading 1" 
        />
        <ToolbarButton 
          icon={Heading2} 
          active={activeHeading === 'h2'} 
          onClick={() => onToggleHeading('h2')}
          onMouseDown={preventDefaultAndSave}
          label="Heading 2" 
        />
        <ToolbarButton 
          icon={Heading3} 
          active={activeHeading === 'h3'} 
          onClick={() => onToggleHeading('h3')}
          onMouseDown={preventDefaultAndSave}
          label="Heading 3" 
        />
        
        {/* Text Size Input */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={textSizeInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || val === '-' || /^\d+$/.test(val)) {
                    onTextSizeChange(val);
                  }
                }}
                onBlur={onTextSizeBlur}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSaveSelection();
                }}
                className="h-7 w-12 text-xs text-center px-1"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Font size (8-72px)</p>
          </TooltipContent>
        </Tooltip>
        
        <ToolbarDivider />
        
        {/* Lists */}
        <ToolbarButton 
          icon={List} 
          active={isCommandActive('insertUnorderedList')} 
          onClick={() => onExecCommand('insertUnorderedList')} 
          label="Bullet List" 
        />
        <ToolbarButton 
          icon={ListOrdered} 
          active={isCommandActive('insertOrderedList')} 
          onClick={() => onExecCommand('insertOrderedList')} 
          label="Numbered List" 
        />
        
        <ToolbarDivider />
        
        {/* Block elements */}
        <ToolbarButton 
          icon={Quote} 
          onClick={() => onFormatBlock('blockquote')}
          onMouseDown={preventDefaultAndSave}
          label="Quote" 
        />
        <ToolbarButton 
          icon={Code} 
          onClick={onInsertCodeBlock}
          onMouseDown={preventDefaultAndSave}
          label="Code Block" 
        />
        <ToolbarButton 
          icon={Minus} 
          onClick={onInsertDivider} 
          label="Horizontal Rule" 
        />
        <ToolbarButton 
          icon={Table} 
          onClick={onInsertTable} 
          label="Insert Table" 
        />
        
        <ToolbarDivider />
        
        {/* Links and media */}
        <ToolbarButton 
          icon={Link} 
          onClick={onInsertLink}
          onMouseDown={preventDefaultAndSave}
          label="Insert Link (Ctrl+K)" 
        />
        <ToolbarButton 
          icon={Image} 
          onClick={onInsertImage}
          disabled={isUploading || !organizationId}
          label="Upload Image" 
        />
        <ToolbarButton 
          icon={FileText} 
          onClick={onInsertFile}
          disabled={isUploading || !organizationId}
          label="Attach File" 
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onMouseDown={preventDefaultAndSave}
          onClick={onInsertEmbed}
        >
          <Upload className="h-4 w-4 mr-1" />
          Embed
        </Button>
        
        <ToolbarDivider />
        
        {/* AI Writing Assist */}
        <WikiAIWritingAssist
          currentText={editorValue}
          onTextGenerated={onAIGenerated}
          context="Writing wiki documentation for internal knowledge base"
          disabled={isUploading}
        />
      </div>
    </TooltipProvider>
  );
});

EditorToolbar.displayName = 'EditorToolbar';

export default EditorToolbar;
