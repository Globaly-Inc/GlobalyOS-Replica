/**
 * EditorToolbar - Memoized toolbar component for WikiRichEditor
 * Extracted to prevent re-renders on every keystroke
 */

import React, { memo } from 'react';
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
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  hasSelection: boolean;
  editorValue: string;
  onToggleHeading: (heading: 'h1' | 'h2' | 'h3') => void;
  onTextSizeChange: (value: string) => void;
  onExecCommand: (command: string, value?: string) => void;
  onFormatBlock: (tag: string) => void;
  onInsertList: (type: 'ul' | 'ol') => void;
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
}

const ToolbarButton = memo(({ 
  icon: Icon, 
  active, 
  onClick, 
  label,
  disabled,
  className
}: { 
  icon: typeof Bold; 
  active?: boolean; 
  onClick: () => void; 
  label: string;
  disabled?: boolean;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        disabled={disabled}
        className={cn(
          "h-8 w-8 p-0",
          active && "bg-accent text-accent-foreground",
          className
        )}
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

export const EditorToolbar = memo(({
  activeHeading,
  activeTextSize,
  textSizeInput,
  isUploading,
  isBold,
  isItalic,
  isUnderline,
  hasSelection,
  editorValue,
  onToggleHeading,
  onTextSizeChange,
  onExecCommand,
  onFormatBlock,
  onInsertList,
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
}: EditorToolbarProps) => {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30 sticky top-0 z-10">
        {/* Undo/Redo */}
        <div className="flex items-center border-r border-border pr-1 mr-1">
          <ToolbarButton icon={Undo2} onClick={onUndo} label="Undo (Ctrl+Z)" />
          <ToolbarButton icon={Redo2} onClick={onRedo} label="Redo (Ctrl+Y)" />
        </div>

        {/* Text formatting */}
        <div className="flex items-center border-r border-border pr-1 mr-1">
          <ToolbarButton 
            icon={Bold} 
            active={isBold} 
            onClick={() => onExecCommand('bold')} 
            label="Bold (Ctrl+B)" 
          />
          <ToolbarButton 
            icon={Italic} 
            active={isItalic} 
            onClick={() => onExecCommand('italic')} 
            label="Italic (Ctrl+I)" 
          />
          <ToolbarButton 
            icon={Underline} 
            active={isUnderline} 
            onClick={() => onExecCommand('underline')} 
            label="Underline (Ctrl+U)" 
          />
        </div>

        {/* Headings */}
        <div className="flex items-center border-r border-border pr-1 mr-1">
          <ToolbarButton 
            icon={Heading1} 
            active={activeHeading === 'h1'} 
            onClick={() => onToggleHeading('h1')} 
            label="Heading 1" 
          />
          <ToolbarButton 
            icon={Heading2} 
            active={activeHeading === 'h2'} 
            onClick={() => onToggleHeading('h2')} 
            label="Heading 2" 
          />
          <ToolbarButton 
            icon={Heading3} 
            active={activeHeading === 'h3'} 
            onClick={() => onToggleHeading('h3')} 
            label="Heading 3" 
          />
        </div>

        {/* Text size */}
        <div className="flex items-center border-r border-border pr-1 mr-1 gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Type className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={textSizeInput}
                  onChange={(e) => onTextSizeChange(e.target.value)}
                  className="h-7 w-10 text-xs text-center p-0"
                  disabled={!hasSelection && activeTextSize === -1}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Font size (px)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Lists */}
        <div className="flex items-center border-r border-border pr-1 mr-1">
          <ToolbarButton 
            icon={List} 
            onClick={() => onInsertList('ul')} 
            label="Bullet list" 
          />
          <ToolbarButton 
            icon={ListOrdered} 
            onClick={() => onInsertList('ol')} 
            label="Numbered list" 
          />
        </div>

        {/* Insert items */}
        <div className="flex items-center border-r border-border pr-1 mr-1">
          <ToolbarButton 
            icon={Link} 
            onClick={onInsertLink} 
            label="Insert link (Ctrl+K)" 
          />
          <ToolbarButton 
            icon={Image} 
            onClick={onInsertImage} 
            label="Insert image" 
            disabled={isUploading}
          />
          <ToolbarButton 
            icon={FileText} 
            onClick={onInsertFile} 
            label="Attach file" 
            disabled={isUploading}
          />
        </div>

        {/* Blocks */}
        <div className="flex items-center border-r border-border pr-1 mr-1">
          <ToolbarButton 
            icon={Code} 
            onClick={onInsertCodeBlock} 
            label="Code block" 
          />
          <ToolbarButton 
            icon={Quote} 
            onClick={() => onFormatBlock('blockquote')} 
            label="Quote" 
          />
          <ToolbarButton 
            icon={Table} 
            onClick={onInsertTable} 
            label="Insert table" 
          />
          <ToolbarButton 
            icon={Minus} 
            onClick={onInsertDivider} 
            label="Divider" 
          />
        </div>

        {/* Embed */}
        <div className="flex items-center border-r border-border pr-1 mr-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={onInsertEmbed}
                >
                  Embed URL (YouTube, etc.)
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* AI Writing Assist */}
        <div className="flex items-center ml-auto">
          <WikiAIWritingAssist
            currentText={editorValue}
            onTextGenerated={onAIGenerated}
          />
        </div>
      </div>
    </TooltipProvider>
  );
});

EditorToolbar.displayName = 'EditorToolbar';

export default EditorToolbar;
